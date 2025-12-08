
import { WeatherType, AtmosphereState } from "../types";

// WMO Weather interpretation codes (WW)
const getWeatherType = (code: number): WeatherType => {
  if (code <= 3) return WeatherType.SUNNY;
  if ([45, 48].includes(code)) return WeatherType.SUNNY; // Fog -> Calm Sunny visual
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return WeatherType.RAINY;
  if ([95, 96, 99].includes(code)) return WeatherType.STORM;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return WeatherType.SNOW;
  return WeatherType.SUNNY;
};

export const fetchLocalWeather = async (lat: number, lon: number): Promise<AtmosphereState> => {
  try {
    // Open-Meteo Free API - Added temperature_2m
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,is_day,wind_speed_10m,precipitation,temperature_2m`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.current) throw new Error("No weather data");

    const current = data.current;
    const weatherCode = current.weather_code;
    const windKmh = current.wind_speed_10m;
    const temp = current.temperature_2m;
    const isDay = current.is_day === 1;
    
    const baseType = getWeatherType(weatherCode);
    let finalType = baseType;
    
    // Override type based on day/night if it's clear
    if (!isDay && baseType === WeatherType.SUNNY) {
        finalType = WeatherType.NIGHT;
    }

    // --- Wave Logic ---
    // Wind maps to amplitude. 
    // 0 kmh -> 15 amp (Calm)
    // 20 kmh -> 25 amp (Breeze)
    // 50+ kmh -> 45 amp (Rough)
    let waveAmp = 15 + (windKmh * 0.8);
    if (waveAmp > 50) waveAmp = 50; // Cap

    // Wind maps to speed
    let waveSpeed = 0.8 + (windKmh * 0.02);
    if (waveSpeed > 2.0) waveSpeed = 2.0;

    // Storm overrides
    let lightning = false;
    if (finalType === WeatherType.STORM) {
        waveAmp = Math.max(waveAmp, 40);
        waveSpeed = Math.max(waveSpeed, 1.5);
        lightning = true;
    }

    // --- Rainbow Logic ---
    let hasRainbow = false;
    if (isDay) {
        if (finalType === WeatherType.SUNNY) {
            hasRainbow = Math.random() < 0.1; // 10% chance
        } else if (finalType === WeatherType.RAINY) {
            // Check for light rain codes for "Sunshower" effect
            if ([51, 61, 80].includes(weatherCode)) {
                hasRainbow = true; 
            }
        }
    }

    return {
      type: finalType,
      waveAmp,
      waveSpeed,
      windSpeed: windKmh,
      temperature: temp,
      hasRainbow,
      isDay,
      lightning
    };

  } catch (e) {
    console.error("Weather fetch failed, using default", e);
    // Default Fallback
    return {
      type: WeatherType.SUNNY,
      waveAmp: 20,
      waveSpeed: 1.0,
      windSpeed: 10,
      temperature: 20,
      hasRainbow: false,
      isDay: true,
      lightning: false
    };
  }
};