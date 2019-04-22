<h2>Video Annotation Tool</h2>
<h3>https://yuval-s.github.io/vatic.js</h3>

Create bounding boxes for a selected video file. Generate a .zip file with the same name of the original video,
for each frame there's a .txt file with the following strcture:

| Class | Center x | Center y | BBox width | BBox height |
| ----- | -------- | -------- | ---------- | ----------- |
* *Note that the above dimensions are normalized (automatically) by the frame dimensions.*

Not working in Safari, StreamSaver missing Safari support: https://github.com/jimmywarting/StreamSaver.js



---
Forked from - https://github.com/dbolkensteyn/vatic.js
