const fs = require('fs');
const { PNG } = require('pngjs');

function removeBg() {
  console.log("Reading SVG...");
  const svgData = fs.readFileSync('../public/Image/logo/DompetKu.svg', 'utf8');
  console.log("Extracting base64...");
  
  const match = svgData.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
  if (!match) {
    console.log("Base64 image not found in SVG");
    return;
  }
  
  const base64Data = match[1];
  const buffer = Buffer.from(base64Data, 'base64');
  
  console.log("Loading image with pngjs...");
  const png = PNG.sync.read(buffer);
  
  console.log("Processing image...", png.width, "x", png.height);
  const targetColor = { r: 255, g: 255, b: 255 }; // white
  const tolerance = 50;

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      
      // check if pixel is white or close to white
      if (
        Math.abs(r - targetColor.r) <= tolerance &&
        Math.abs(g - targetColor.g) <= tolerance &&
        Math.abs(b - targetColor.b) <= tolerance
      ) {
        png.data[idx + 3] = 0; // set alpha to 0
      }
    }
  }

  console.log("Saving image...");
  const outBuffer = PNG.sync.write(png);
  fs.writeFileSync('../public/Image/logo/DompetKu-transparent.png', outBuffer);
  console.log("Done!");
}

removeBg();
