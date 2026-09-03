// 智能色度键与透明通道处理引擎 (ChromaKey Alpha Processor)
// 自动消除纯色/白底背景，生成边缘羽化抗锯齿的高精透明精灵
export class ChromaKeyProcessor {
  static processImage(img, tolerance = 38, feather = 24) {
    if (!img || !img.complete || img.naturalWidth === 0) return img;

    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 采样四个角落的背景基色
    const samples = [
      0, // 左上
      (w - 1) * 4, // 右上
      (h - 1) * w * 4, // 左下
      ((h - 1) * w + (w - 1)) * 4 // 右下
    ];

    let bgR = 0, bgG = 0, bgB = 0;
    samples.forEach(idx => {
      bgR += data[idx];
      bgG += data[idx + 1];
      bgB += data[idx + 2];
    });
    bgR /= 4;
    bgG /= 4;
    bgB /= 4;

    // 像素级色彩距离计算与羽化
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // 针对白底/浅色底的亮度加权色彩距离
      const dist = Math.sqrt(
        (r - bgR) * (r - bgR) * 0.299 +
        (g - bgG) * (g - bgG) * 0.587 +
        (b - bgB) * (b - bgB) * 0.114
      );

      // 也对绝对高亮白色像素进行滤除
      const isHighWhite = (r > 240 && g > 240 && b > 240);

      if (dist < tolerance || isHighWhite) {
        data[i + 3] = 0; // 完全透明
      } else if (dist < tolerance + feather) {
        const factor = (dist - tolerance) / feather;
        data[i + 3] = Math.round(data[i + 3] * factor); // 边缘平滑羽化
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }
}
