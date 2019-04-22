<h2>Video Annotation Tool</h2>
<h3>https://yuval-s.github.io/vatic.js</h3>

**Create bounding boxes for a selected video file.**
<br>
Generate a *video-name*.zip, for each frame there's a *frame-number*.txt file including its annotations.
<br>
The annotations follows the below structure:

| Class | Center x | Center y | BBox width | BBox height |
| ----- | -------- | -------- | ---------- | ----------- |
* *Note that the above dimensions are normalized (automatically) by the frame dimensions.*

This file structure and annotations structure follow the [Darknet-YOLO3 CNN](https://pjreddie.com/darknet/) labels structure.

Not working in Safari, StreamSaver missing Safari support: https://github.com/jimmywarting/StreamSaver.js

<br><br>


---
Forked from - https://github.com/dbolkensteyn/vatic.js
