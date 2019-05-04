"use strict";

let config = {
	// Should be higher than real FPS to not skip real frames
	// Hardcoded due to JS limitations
	fps: 30,

	// Low rate decreases the chance of losing frames with poor browser performances
	playbackRate: 0.4,

	// Format of the extracted frames
	imageMimeType: 'image/jpeg',
	imageExtension: '.jpg',
};

let canvasMouseOver = false;
let Video = document.getElementById('videoFile');
let videoName;
let zipName = document.getElementById('zipFile');
let doodle = document.querySelector('#doodle');
let canvas = document.querySelector('#canvas');
let ctx = canvas.getContext('2d');
let videoFile = document.querySelector('#videoFile');
let zipFile = document.querySelector('#zipFile');
//       let xmlFile = document.querySelector('#xmlFile');
let saveElement = document.querySelector('#save');
let progressElement = document.querySelector('#progress');
let videoBlockElement = document.querySelector('#videoBlock');
let objectsElement = document.querySelector('#objects');
let videoDimensionsElement = document.querySelector('#videoDimensions');
let extractionProgressElement = document.querySelector('#extractionProgress');
let downloadFramesButton = document.querySelector('#downloadFrames');
let playButton = document.querySelector('#play');
let speedInput = document.querySelector('#speed');
let sliderElement = document.querySelector('#slider');
let sliderBlockElement = document.querySelector('#sliderBlock');
let generateXmlButton = document.querySelector('#generateXml');
let frameCount = document.querySelector('#frameCount');

let framesManager = new FramesManager();
let annotatedObjectsTracker = new AnnotatedObjectsTracker(framesManager);

let slider = {
	init: function(min, max, onChange) {
		$(sliderElement).slider('option', 'min', min);
		$(sliderElement).slider('option', 'max', max);
		$(sliderElement).on('slidestop', (e, ui) => {
			onChange(ui.value);
		});
		$(sliderElement).slider('enable');
		
		frameCount.innerHTML = '0 / ' + max;

	},
	setPosition: function(frameNumber) {
		$(sliderElement).slider('option', 'value', frameNumber);
	},
	reset: function() {
		$(sliderElement).slider({disabled: true});
	}
};
slider.reset();

let player = {
	currentFrame: 0,
	isPlaying: false,
	isReady: false,
	timeout: null,

	initialize: function() {
		this.currentFrame = 0;
		this.isPlaying = false;
		this.isReady = false;

		playButton.disabled = true;
	},

	ready: function() {
		this.isReady = true;

		playButton.disabled = false;
	},

	seek: function(frameNumber) {
		if (!this.isReady) {
			return;
		}

		this.pause();
		playButton.value = "►";

		if (frameNumber >= 0 && frameNumber < framesManager.frames.totalFrames()) {
			this.drawFrame(frameNumber);
			this.currentFrame = frameNumber;
		}
	},

	play: function() {
		if (!this.isReady) {
			return;
		}

		this.isPlaying = true;
		this.nextFrame();
	},

	pause: function() {
		if (!this.isReady) {
			return;
		}

		this.isPlaying = false;
		if (this.timeout != null) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
	},

	toogle: function() {
		if (!this.isPlaying) {
			this.play();
			if(!playButton.disabled){
				playButton.value = "◼︎︎";
			}
		} else {
			this.pause();
			playButton.value = "►";
		}
	},

	nextFrame: function() {
		if (!this.isPlaying) {
			return;
		}

		if (this.currentFrame >= framesManager.frames.totalFrames()) {
			this.done();
			return;
		}

		this.drawFrame(this.currentFrame).then(() => {
			this.currentFrame++;
			this.timeout = setTimeout(() => this.nextFrame(), 1000 / (config.fps * parseFloat(speedInput.value)));
		});
	},

	drawFrame: function(frameNumber) {
		return new Promise((resolve, _) => {
			annotatedObjectsTracker.getFrameWithObjects(frameNumber).then((frameWithObjects) => {
				ctx.drawImage(frameWithObjects.img, 0, 0);

				frameCount.innerHTML = (frameNumber + ' / ' + $(sliderElement).slider('option', 'max'))

				for (let i = 0; i < frameWithObjects.objects.length; i++) {
					let object = frameWithObjects.objects[i];
					let annotatedObject = object.annotatedObject;
					let annotatedFrame = object.annotatedFrame;
					if (annotatedFrame.isVisible()) {
						annotatedObject.dom.style.display = 'block';
						annotatedObject.dom.style.width = annotatedFrame.bbox.width + 'px';
						annotatedObject.dom.style.height = annotatedFrame.bbox.height + 'px';
						annotatedObject.dom.style.left = annotatedFrame.bbox.x + 'px';
						annotatedObject.dom.style.top = annotatedFrame.bbox.y + 'px';
						annotatedObject.visible.prop('checked', true);
					} else {
						annotatedObject.dom.style.display = 'none';
						annotatedObject.visible.prop('checked', false);
					}
				}

				let shouldHideOthers = frameWithObjects.objects.some(o => o.annotatedObject.hideOthers);
				if (shouldHideOthers) {
					for (let i = 0; i < frameWithObjects.objects.length; i++) {
						let object = frameWithObjects.objects[i];
						let annotatedObject = object.annotatedObject;
						if (!annotatedObject.hideOthers) {
							annotatedObject.dom.style.display = 'none';
						}
					}
				}

				slider.setPosition(this.currentFrame);

				resolve();
			});
		});
	},

	done: function() {
		this.currentFrame = 0;
		this.isPlaying = false;
		playButton.value = "►";
	}
};

function clearAllAnnotatedObjects() {
	for (let i = 0; i < annotatedObjectsTracker.annotatedObjects.length; i++) {
		clearAnnotatedObject(i);
	}
}

function clearAnnotatedObject(i) {
	let annotatedObject = annotatedObjectsTracker.annotatedObjects[i];
	annotatedObject.controls.remove();
	$(annotatedObject.dom).remove();
	annotatedObjectsTracker.annotatedObjects.splice(i, 1);
}
	
canvas.addEventListener("mouseover", canvasOver);
canvas.addEventListener("mouseout", canvasOut);
videoFile.addEventListener('change', extractionFileUploaded, false);
zipFile.addEventListener('change', extractionFileUploaded, false);
// xmlFile.addEventListener('change', importXml, false);
playButton.addEventListener('click', playClicked, false);
downloadFramesButton.addEventListener('click', downloadFrames, false);
generateXmlButton.addEventListener('click', generateXml, false);

function canvasOver() {
	canvasMouseOver = true;
}

function canvasOut() {
	canvasMouseOver = false;
}

function playClicked() {
	if (!player.isPlaying) {
		player.play();
		playButton.value = "◼︎︎";
	} else {
		player.pause();
		playButton.value = "►";
	}
}

function downloadFrames() {
	let zip = new JSZip();

	let processed = 0;
	let totalFrames = framesManager.frames.totalFrames();
	for (let i = 0; i < totalFrames; i++) {
		framesManager.frames.getFrame(i).then((blob) => {
			zip.file(videoName + '_' + i + '.jpg', blob);

			processed++;
			if (processed == totalFrames) {
				let writeStream = streamSaver.createWriteStream(videoName + '_frames.zip').getWriter();
				zip.generateInternalStream({type: 'uint8array', streamFiles: true})
					 .on('data', data => writeStream.write(data))
					 .on('end', () => writeStream.close())
					 .resume();
			}
		});
	}
}

function initializeCanvasDimensions(img) {
	doodle.style.width = img.width + 'px';
	doodle.style.height = img.height + 'px';
//         document.getElementById('videoBlock').hidden = false;
//         videoBlockElement.hidden = false;
	videoBlockElement.style.width = (1000>img.width ? 1000 + 'px' : img.width + 'px');
//         canvas.hidden = false;
	canvas.width = img.width;
	canvas.height = img.height;
	sliderElement.style.width = img.width-220 + 'px';
	sliderBlockElement.style.width = img.width + 'px';
}

function extractionFileUploaded() {
	if (this.files.length != 1) {
		return;
	}
	if (this == videoFile) {
		let tmp = Video.files.item(0).name;
		if(tmp.substring(tmp.lastIndexOf(".")+1) == "avi" || tmp.substring(tmp.lastIndexOf(".")+1) == "AVI"){
			progressElement.hidden = false;
			extractionProgressElement.innerHTML = 'No support for <span id="code">AVI</span> files, please try another video.';
			return;
		}
	}
	videoBlockElement.hidden = true;
	saveElement.hidden = true;
	videoFile.disabled = true;
	zipFile.disabled = true;
	// xmlFile.disabled = true;
	downloadFramesButton.disabled = true;
	generateXmlButton.disabled = true;
	clearAllAnnotatedObjects();
	slider.reset();
	player.initialize();

	let promise;
	progressElement.hidden = false;
	if (this == videoFile) {
		let tmp = Video.files.item(0).name;
		videoName = tmp.substring(0, tmp.lastIndexOf("."));
		let dimensionsInitialized = false;

		promise = extractFramesFromVideo(
			config,
			this.files[0],
			(percentage, framesSoFar, lastFrameBlob) => {
				blobToImage(lastFrameBlob).then((img) => {
					if (!dimensionsInitialized) {
						dimensionsInitialized = true;
						initializeCanvasDimensions(img);
					}
					ctx.drawImage(img, 0, 0);

					videoDimensionsElement.innerHTML = 'Video dimensions: ' + img.width + 'x' + img.height;
					extractionProgressElement.innerHTML = 'Processing: <b>' + videoName + '</b> - ' + (percentage * 100).toFixed(2) + '% completed, ' + framesSoFar + ' frames extracted';
				});
			});
	} else {
		let tmp = zipName.files.item(0).name;
		if(tmp.substring(0, tmp.lastIndexOf("_frames")).length > 0){
			videoName = tmp.substring(0, tmp.lastIndexOf("_frames"));
		} else{
			videoName = tmp.substring(0, tmp.lastIndexOf("."));
		}
//       		config.framesZipFilename = videoName.substring(0, videoName.length - 11);
// 					config.framesZipFilename = videoName.substring(0, videoName.length - 4);
		config.framesZipFilename = videoName;
		promise = extractFramesFromZip(config, this.files[0]);
	}

	promise.then((frames) => {
		if(this == videoFile){
			extractionProgressElement.innerHTML = 'Processing: <b>' + videoName + '</b> - Extraction completed, ' + frames.totalFrames() + ' frames captured';
		} else{
			extractionProgressElement.innerHTML = 'Processing: <b>' + videoName + '</b> - Extraction completed, ' + frames.totalFrames() + ' frames captured';
		}
		if (frames.totalFrames() > 0) {
			frames.getFrame(0).then((blob) => {
				blobToImage(blob).then((img) => {
					initializeCanvasDimensions(img);
					ctx.drawImage(img, 0, 0);
					videoDimensionsElement.innerHTML = 'Video dimensions: ' + img.width + 'x' + img.height;

					framesManager.set(frames);
					slider.init(
						0,
						framesManager.frames.totalFrames() - 1,
						(frameNumber) => player.seek(frameNumber)
					);
					player.ready();

//                 xmlFile.disabled = false;
//                 playButton.disabled = false;
					videoBlockElement.hidden = false;
					saveElement.hidden = false;
					document.getElementById('upNew').hidden = false;
					downloadFramesButton.disabled = false;
					generateXmlButton.disabled = false;
					videoFile.disabled = true;
					zipFile.disabled = true;
				});
			});
		}

		videoFile.disabled = false;
		zipFile.disabled = false;
	});
}

function interactify(dom, onChange) {
	let bbox = $(dom);
	bbox.addClass('bbox');

	let createHandleDiv = (className) => {
		let handle = document.createElement('div');
		handle.className = className;
		bbox.append(handle);
		return handle;
	};

	bbox.resizable({
		containment: 'parent',
		handles: {
			n: createHandleDiv('ui-resizable-handle ui-resizable-n'),
			s: createHandleDiv('ui-resizable-handle ui-resizable-s'),
			e: createHandleDiv('ui-resizable-handle ui-resizable-e'),
			w: createHandleDiv('ui-resizable-handle ui-resizable-w')
		},
		stop: (e, ui) => {
			let position = bbox.position();
			onChange(Math.round(position.left), Math.round(position.top), Math.round(bbox.width()), Math.round(bbox.height()));
		}
	});

	bbox.draggable({
		containment: 'parent',
		handle: createHandleDiv('handle center-drag'),
		stop: (e, ui) => {
			let position = bbox.position();
			onChange(Math.round(position.left), Math.round(position.top), Math.round(bbox.width()), Math.round(bbox.height()));
		}
	});
}

let mouse = {
	x: 0,
	y: 0,
	startX: 0,
	startY: 0
};

let tmpAnnotatedObject = null;

doodle.onmousemove = function (e) {
	let ev = e || window.event;
	if (ev.pageX) {
		mouse.x = ev.pageX;
		mouse.y = ev.pageY;
	} else if (ev.clientX) {
		mouse.x = ev.clientX;
		mouse.y = ev.clientY;
	}
	mouse.x -= doodle.offsetLeft;
	mouse.y -= doodle.offsetTop;

	if (tmpAnnotatedObject !== null) {
		tmpAnnotatedObject.width = Math.abs(mouse.x - mouse.startX);
		tmpAnnotatedObject.height = Math.abs(mouse.y - mouse.startY);
		tmpAnnotatedObject.x = (mouse.x - mouse.startX < 0) ? mouse.x : mouse.startX;
		tmpAnnotatedObject.y = (mouse.y - mouse.startY < 0) ? mouse.y : mouse.startY;

		tmpAnnotatedObject.dom.style.width = tmpAnnotatedObject.width + 'px';
		tmpAnnotatedObject.dom.style.height = tmpAnnotatedObject.height + 'px';
		tmpAnnotatedObject.dom.style.left = tmpAnnotatedObject.x + 'px';
		tmpAnnotatedObject.dom.style.top = tmpAnnotatedObject.y + 'px';
	}
}

doodle.onclick = function (e) {
	if (doodle.style.cursor != 'crosshair') {
		return;
	}

	if (tmpAnnotatedObject != null) {
		let annotatedObject = new AnnotatedObject();
		annotatedObject.dom = tmpAnnotatedObject.dom;
		let bbox = new BoundingBox(tmpAnnotatedObject.x, tmpAnnotatedObject.y, tmpAnnotatedObject.width, tmpAnnotatedObject.height);
		annotatedObject.add(new AnnotatedFrame(player.currentFrame, bbox, true));
		annotatedObjectsTracker.annotatedObjects.push(annotatedObject);
		tmpAnnotatedObject = null;

		interactify(
			annotatedObject.dom,
			(x, y, width, height) => {
				let bbox = new BoundingBox(x, y, width, height);
				annotatedObject.add(new AnnotatedFrame(player.currentFrame, bbox, true));
			}
		);

		addAnnotatedObjectControls(annotatedObject);

		doodle.style.cursor = 'default';
	} else {
		mouse.startX = mouse.x;
		mouse.startY = mouse.y;

		let dom = newBboxElement();
		dom.style.left = mouse.x + 'px';
		dom.style.top = mouse.y + 'px';
		tmpAnnotatedObject = { dom: dom };
	}
}

function newBboxElement() {
		let dom = document.createElement('div');
		dom.className = 'bbox';
		doodle.appendChild(dom);
		return dom;
}

function addAnnotatedObjectControls(annotatedObject) {
	let divID = $('<div style="margin-bottom: 5px;">');
	let id = $('<input type="text" value="0" size="3" style="height: 20px; text-align: center;" />');
	annotatedObject.id = doodle.key;
	if (annotatedObject.id) {
		id.val(annotatedObject.id);
	}
	id.on('change keyup paste mouseup', function() {
		annotatedObject.id = this.value;
	});
	divID.append(id);
	
	let divClass = $('<div style="margin-bottom: 5px; margin-right: 5px; float: left;">');
	let classLabel = $('<select style="height: 26px; width: 100px; font-size: 14px; background-color: #ffffff;"></select>')
	for(let i = 0; i<classes.length; i++){
		let option;
		if(i == doodle.key){
			option = $('<option selected></option>');
		} else{
			option = $('<option></option>');
		}
		option.val(i);
		option.append(classes[i]);
		classLabel.append(option);
	}
	if (annotatedObject.name) {
		classLabel.val(annotatedObject.name);
	}
	classLabel.change(function() {
		id.val(this.value);
		annotatedObject.id = this.value;
	});
	classLabel.on('change keyup paste mouseup', function() {
		annotatedObject.name = this.value;
	});
	divClass.append(classLabel);
	
	let divVisible = $('<div style="margin-bottom: 5px;">');
	let visibleLabel = $('<label>');
	let visible = $('<input type="checkbox" checked="checked" style="margin-right:7px;"/>');
	annotatedObject.visible = visible;
	visible.change(function() {
		let bbox;
		if (this.checked) {
			annotatedObject.dom.style.display = 'block';
			let jquery = $(annotatedObject.dom);
			let position = jquery.position();
			bbox = new BoundingBox(Math.round(position.left), Math.round(position.top), Math.round(jquery.width()), Math.round(jquery.height()));
		} else {
			annotatedObject.dom.style.display = 'none';
			bbox = null;
		}
		annotatedObject.add(new AnnotatedFrame(player.currentFrame, bbox, true));
	});
	visibleLabel.append(visible);
	visibleLabel.append('Visible');
	divVisible.append(visibleLabel);

	let divHide = $('<div style="margin-bottom: 5px;">');
	let hideLabel = $('<label>');
	let hide = $('<input type="checkbox" style="margin-right:7px;"/>');
	hide.change(function() {
		annotatedObject.hideOthers = this.checked;
	});
	hideLabel.append(hide);
	hideLabel.append('Hide others');
	divHide.append(hideLabel);
	
	let divDel = $('<div>');
	let delLabel = $('<label id="button" style="background-color: #E7003B;">');
	let del = $('<input type="button" value="Delete" style="display: none;"/>');
	del.click(function() {
		for (let i = 0; annotatedObjectsTracker.annotatedObjects.length; i++) {
			if (annotatedObject === annotatedObjectsTracker.annotatedObjects[i]) {
				clearAnnotatedObject(i);
				break;
			}
		}
	});
	delLabel.append(del)
	delLabel.append('Delete');
	divDel.append(delLabel);
	
	let div = $('<div id="annotation"></div>');
	div.append(divClass);
	div.append(divID);
	div.append(divVisible);
	div.append(divHide);
	div.append(divDel);

	annotatedObject.controls = div;

	$('#objects').append(div);
}

function generateXml() {
	let zip = new JSZip();
	let processed = 0;
	let totalFrames = framesManager.frames.totalFrames();
	
	for (let frameNumber = 0; frameNumber < totalFrames; frameNumber++){ // for every frame
		let xml = '';
		
		for (let i = 0; i < annotatedObjectsTracker.annotatedObjects.length; i++){ // for every bounding box
			let annotatedObject = annotatedObjectsTracker.annotatedObjects[i];
			let annotatedFrame = annotatedObject.get(frameNumber);
			if (annotatedFrame == null) {
				window.alert('Play the video in full before downloading the XML so that bounding box data is available for all frames.');
				return;
			}
			let bbox = annotatedFrame.bbox;
			if (bbox != null) {
				xml += annotatedObject.id + ' ';
				xml += (Math.round(bbox.x + bbox.width/2)/canvas.width) + ' ';
				xml += (Math.round(bbox.y + bbox.height/2)/canvas.height) + ' ';
				xml += (bbox.width/canvas.width) + ' ';
				xml += (bbox.height/canvas.height);
			}
			if((i < annotatedObjectsTracker.annotatedObjects.length-1) && (bbox != null)){
				xml += '\n';
			}
		}
		
		zip.file(videoName + '_' + frameNumber + '.txt', xml);
		processed++;
		if (processed == totalFrames){
			let writeStream = streamSaver.createWriteStream(videoName + '_annotations.zip').getWriter();
			zip.generateInternalStream({type: 'uint8array', streamFiles: true})
				 .on('data', data => writeStream.write(data))
				 .on('end', () => writeStream.close())
				 .resume();
		}
	}
}

function importXml() {
	if (this.files.length != 1) {
		return;
	}

	var reader = new FileReader();
	reader.onload = (e) => {
		if (e.target.readyState != 2) {
			return;
		}

		if (e.target.error) {
			throw 'file reader error';
		}

		let xml = $($.parseXML(e.target.result));
		let objects = xml.find('object');
		for (let i = 0; i < objects.length; i++) {
			let object = $(objects[i]);
			let name = object.find('name').text();
			let id = object.find('id').text();

			let annotatedObject = new AnnotatedObject();
			annotatedObject.name = name;
			annotatedObject.id = id;
			annotatedObject.dom = newBboxElement();
			annotatedObjectsTracker.annotatedObjects.push(annotatedObject);

			interactify(
				annotatedObject.dom,
				(x, y, width, height) => {
					let bbox = new BoundingBox(x, y, width, height);
					annotatedObject.add(new AnnotatedFrame(player.currentFrame, bbox, true));
				}
			);

			addAnnotatedObjectControls(annotatedObject);

			let lastFrame = -1;
			let polygons = object.find('polygon');
			for (let j = 0; j < polygons.length; j++) {
				let polygon = $(polygons[j]);
				let frameNumber = parseInt(polygon.find('t').text());
				let pts = polygon.find('pt');
				let topLeft = $(pts[0]);
				let bottomRight = $(pts[2]);
				let isGroundThrough = parseInt(topLeft.find('l').text()) == 1;
				let x = parseInt(topLeft.find('x').text());
				let y = parseInt(topLeft.find('y').text());
				let w = parseInt(bottomRight.find('x').text()) - x;
				let h = parseInt(bottomRight.find('y').text()) - y;

				if (lastFrame + 1 != frameNumber) {
					let annotatedFrame = new AnnotatedFrame(lastFrame + 1, null, true);
					annotatedObject.add(annotatedFrame);
				}

				let bbox = new BoundingBox(x, y, w, h);
				let annotatedFrame = new AnnotatedFrame(frameNumber, bbox, isGroundThrough);
				annotatedObject.add(annotatedFrame);

				lastFrame = frameNumber;
			}

			if (lastFrame + 1 < framesManager.frames.totalFrames()) {
				let annotatedFrame = new AnnotatedFrame(lastFrame + 1, null, true);
				annotatedObject.add(annotatedFrame);
			}
		}

		player.drawFrame(player.currentFrame);
	};
	reader.readAsText(this.files[0]);
}


// Keyboard shortcuts
window.onkeydown = function(e) {

	let preventDefault = true;
	if (e.keyCode === 32) { // space
		player.toogle();
	} else if (e.keyCode === 78 && canvasMouseOver) { // n
		doodle.style.cursor = 'crosshair';
		doodle.key = 0;
	} else if ((e.keyCode === 48 || e.keyCode === 96) && classes.length > 0 && canvasMouseOver) { // 0
		doodle.style.cursor = 'crosshair';
		doodle.key = 0;
	} else if ((e.keyCode === 49 || e.keyCode === 97) && classes.length > 1 && canvasMouseOver) { // 1
		doodle.style.cursor = 'crosshair';
		doodle.key = 1;
	} else if ((e.keyCode === 50 || e.keyCode === 98) && classes.length > 2 && canvasMouseOver) { // 2
		doodle.style.cursor = 'crosshair';
		doodle.key = 2;
	} else if ((e.keyCode === 51 || e.keyCode === 99) && classes.length > 3 && canvasMouseOver) { // 3
		doodle.style.cursor = 'crosshair';
		doodle.key = 3;
	} else if ((e.keyCode === 52 || e.keyCode === 100) && classes.length > 4 && canvasMouseOver) { // 4
		doodle.style.cursor = 'crosshair';
		doodle.key = 4;
	} else if ((e.keyCode === 53 || e.keyCode === 101) && classes.length > 5 && canvasMouseOver) { // 5
		doodle.style.cursor = 'crosshair';
		doodle.key = 5;
	} else if ((e.keyCode === 54 || e.keyCode === 102) && classes.length > 6 && canvasMouseOver) { // 6
		doodle.style.cursor = 'crosshair';
		doodle.key = 6;
	} else if ((e.keyCode === 55 || e.keyCode === 103) && classes.length > 7 && canvasMouseOver) { // 7
		doodle.style.cursor = 'crosshair';
		doodle.key = 7;
	} else if ((e.keyCode === 56 || e.keyCode === 104) && classes.length > 8 && canvasMouseOver) { // 8
		doodle.style.cursor = 'crosshair';
		doodle.key = 8;
	} else if ((e.keyCode === 57 || e.keyCode === 105) && classes.length > 9 && canvasMouseOver) { // 9
		doodle.style.cursor = 'crosshair';
		doodle.key = 9;
	} else if (e.keyCode === 27) { // escape
		if (tmpAnnotatedObject != null) {
			doodle.removeChild(tmpAnnotatedObject.dom);
			tmpAnnotatedObject = null;
		}
		doodle.style.cursor = 'default';
	} else if (e.keyCode == 37) { // left
		player.seek(player.currentFrame - 1);
	} else if (e.keyCode == 39) { // right
		player.seek(player.currentFrame + 1);
	} else {
		preventDefault = false;
	}

	if (preventDefault) {
		e.preventDefault();
	}
};