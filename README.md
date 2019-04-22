<h2>Video Annotation Tool</h2>

**Create bounding boxes for a selected video file**
<h4>https://yuval-s.github.io/vatic.js</h4>

Generate a *video-name*.zip, for each frame there's a *frame-number*.txt file including its annotations.
<br>
The annotations follows the below structure:

| Class | Center x | Center y | BBox width | BBox height |
| ----- | -------- | -------- | ---------- | ----------- |
* *Note that the above dimensions are normalized (automatically) by the frame dimensions.*

This file structure and annotations follow the [Darknet-YOLOv3 CNN](https://pjreddie.com/darknet/) labels structure.

<br><br>

Not working in Safari & IE/Edge, StreamSaver missing support: https://github.com/jimmywarting/StreamSaver.js

---
Forked from - https://github.com/dbolkensteyn/vatic.js
