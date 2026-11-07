# 晴天航行 Demo

独立静态 Canvas 2D 页面，不进入现有 App 路由，不包含任何 API key。

运行：

```bash
cd public
python3 -m http.server 8080
```

打开 `http://127.0.0.1:8080/sunny-sailing-demo/`。也可以直接双击 `index.html`，无需服务器或 ES Module。

渲染：静态背景单独缓存，动态素材预缩放，DPR 上限 1.5；海底无静态浪纹，全海域使用同一套动态纹理；太阳圆盘静止、光芒旋转；旗面分段传摆，烟雾从烟囱起步。

连续动画预览见 `preview.mp4`（6 秒）。

- 空格或右上角按钮：暂停 / 继续
- `?t=3`：固定在第 3 秒，便于截图对比
- 30 fps 上限、DPR 上限 1.5、后台暂停动画

素材由 WaveSpeed GPT Image 2.6 Flare Edit 生成，源参考为用户指定绘本页。
