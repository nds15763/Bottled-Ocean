/**
 * 日式扁平插画风格（Irasutoya Style）配色主题
 * 用于统一管理所有天气状态下的颜色配置
 */

export interface WeatherTheme {
  sky: [string, string];                    // 天空渐变 [顶部, 底部]
  ocean: [string, string, string, string];  // 海洋4层 [表面, 浅层, 中层, 深层]
  clouds: string;                           // 云朵颜色
  silhouetteFish: string;                   // 海下鱼群剪影颜色（带透明度）
  rain?: string;                            // 雨滴颜色
  snow?: string;                            // 雪花颜色
}

export const IRASUTOYA_THEME: Record<string, WeatherTheme> = {
  // 晴天 - 明亮的蓝色调
  sunny: {
    sky: ['#87CEEB', '#B0E0E6'],
    ocean: ['#87CEEB', '#5B9BD5', '#3A6B96', '#1A3A5C'],
    clouds: '#FFFFFF',
    silhouetteFish: 'rgba(43, 79, 124, 0.25)'
  },
  
  // 夜晚 - 深蓝色调
  night: {
    sky: ['#1a252f', '#0a1520'],
    ocean: ['#2471A3', '#1A5276', '#154360', '#0D2840'],
    clouds: '#3A5068',
    silhouetteFish: 'rgba(10, 30, 50, 0.35)'
  },
  
  // 雨天 - 灰蓝色调
  rainy: {
    sky: ['#7f8c8d', '#4a5568'],
    ocean: ['#5D6D7E', '#4A5A6A', '#3A4A5A', '#2A3A4A'],
    clouds: '#95a5a6',
    silhouetteFish: 'rgba(60, 80, 100, 0.3)',
    rain: 'rgba(255, 255, 255, 0.6)'
  },
  
  // 暴风雨 - 深灰色调
  storm: {
    sky: ['#2c3e50', '#1a252f'],
    ocean: ['#546E7A', '#455A64', '#37474F', '#263238'],
    clouds: '#5D6D7E',
    silhouetteFish: 'rgba(30, 40, 50, 0.4)',
    rain: 'rgba(255, 255, 255, 0.7)'
  },
  
  // 下雪 - 冷色调
  snow: {
    sky: ['#ECF0F1', '#BDC3C7'],
    ocean: ['#AED6F1', '#85C1E9', '#5DADE2', '#3498DB'],
    clouds: '#E8E8E8',
    silhouetteFish: 'rgba(100, 140, 180, 0.2)',
    snow: 'rgba(255, 255, 255, 0.9)'
  },
  
  // 日出/日落 - 暖色调
  sunrise: {
    sky: ['#8E44AD', '#E67E22'],
    ocean: ['#EB984E', '#D35400', '#A04000', '#7B3014'],
    clouds: '#F5CBA7',
    silhouetteFish: 'rgba(80, 40, 20, 0.3)'
  },
  
  // 黄昏 - 橙色调
  sunset: {
    sky: ['#D35400', '#2C3E50'],
    ocean: ['#EB984E', '#D35400', '#A04000', '#6A2C0A'],
    clouds: '#F0B27A',
    silhouetteFish: 'rgba(100, 50, 20, 0.3)'
  }
};

/**
 * 根据天气类型和时间获取对应的主题
 */
export const getThemeForWeather = (
  weatherType: string, 
  hour: number, 
  isDay: boolean
): WeatherTheme => {
  // 优先匹配特殊天气
  if (weatherType === 'STORM') return IRASUTOYA_THEME.storm;
  if (weatherType === 'RAINY') return IRASUTOYA_THEME.rainy;
  if (weatherType === 'SNOW') return IRASUTOYA_THEME.snow;
  if (weatherType === 'NIGHT') return IRASUTOYA_THEME.night;
  
  // 根据时间判断
  if (hour >= 5 && hour < 7) return IRASUTOYA_THEME.sunrise;
  if (hour >= 17 && hour < 19) return IRASUTOYA_THEME.sunset;
  if (!isDay || hour < 5 || hour >= 20) return IRASUTOYA_THEME.night;
  
  return IRASUTOYA_THEME.sunny;
};

