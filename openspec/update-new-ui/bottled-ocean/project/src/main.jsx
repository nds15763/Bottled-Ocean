// Main — 全部画面以 PBSimCanvas 为活背景

function Frame({ children }) {
  return (
    <div style={{ width: 920, height: 460, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <LandscapePhone>{children}</LandscapePhone>
    </div>
  );
}

function App() {
  return (
    <DesignCanvas
      title="瓶中海 · 绘本风（活背景）"
      subtitle="所有画面共用同一套实时模拟（PBSimCanvas）。拨 Tweaks 看小船在不同时间和天气下的样子；其他画面是同一画布在指定参数下的截面。"
    >
      <DCSection id="live" title="实时模拟 · 可调"
        description="复刻 SimulationCanvas 的逻辑（三层波 / 云漂 / 雨雪 / 闪电 / 钓鱼状态机），画风换成绘本。开 Tweaks 调时间、风速、天气、是否在钓鱼。">
        <DCArtboard id="live" label="实时模拟（拨动 Tweaks）" width={920} height={460}>
          <Frame><PBLiveSim/></Frame>
        </DCArtboard>
      </DCSection>

      <DCSection id="menu" title="封面 · 选时长"
        description="进入应用就是绘本的扉页：晴日早晨的港口，三档时长写在天空里。">
        <DCArtboard id="menu" label="选时长 · 晴日港口" width={920} height={460}>
          <Frame><PBMenuHarbor/></Frame>
        </DCArtboard>
      </DCSection>

      <DCSection id="focus" title="进行中 · 跟着真实时间和天气"
        description="同一艘小船走完一整天。文字也跟着场景改。">
        <DCArtboard id="focus-day" label="晴日出海 · 上午" width={920} height={460}>
          <Frame><PBFocusOpenSea/></Frame>
        </DCArtboard>
        <DCArtboard id="focus-rain" label="雨天" width={920} height={460}>
          <Frame><PBFocusRainy/></Frame>
        </DCArtboard>
        <DCArtboard id="focus-storm" label="暴风（顶风航行）" width={920} height={460}>
          <Frame><PBFocusStorm/></Frame>
        </DCArtboard>
        <DCArtboard id="focus-snow" label="雪日" width={920} height={460}>
          <Frame><PBFocusSnow/></Frame>
        </DCArtboard>
        <DCArtboard id="focus-dusk" label="暮色航行" width={920} height={460}>
          <Frame><PBFocusDusk/></Frame>
        </DCArtboard>
        <DCArtboard id="focus-night" label="星夜停泊" width={920} height={460}>
          <Frame><PBFocusStarryNight/></Frame>
        </DCArtboard>
      </DCSection>

    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
