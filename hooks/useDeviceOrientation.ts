import { useState, useEffect, useCallback } from 'react';

interface OrientationState {
  tilt: number; // Tilt angle in radians relative to screen bottom
  rawX: number;
  rawY: number;
}

export const useDeviceOrientation = () => {
  const [orientation, setOrientation] = useState<OrientationState>({ tilt: 0, rawX: 0, rawY: 0 });
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  // Check if device orientation is likely supported (mobile)
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) {
      setIsDesktop(true);
    }
  }, []);

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const { accelerationIncludingGravity } = event;
    if (!accelerationIncludingGravity) return;

    const x = accelerationIncludingGravity.x || 0;
    const y = accelerationIncludingGravity.y || 0;

    // Determine screen orientation correction
    // Default (Portrait): 0
    // Landscape Left: 90
    // Landscape Right: -90 / 270
    const screenAngle = window.screen.orientation?.angle || 0;
    const screenRad = (screenAngle * Math.PI) / 180;

    // Calculate angle of gravity vector relative to device
    // atan2(x, y) gives angle from Y-axis.
    // In portrait upright: x=0, y=-9.8 (Gravity pulls down). atan2(0, -9.8) = 180 deg (PI).
    // We want 0 to be flat/upright relative to screen bottom? 
    // Actually, let's just get the angle relative to the device X/Y plane.
    const deviceGravityAngle = Math.atan2(x, y);

    // Correct for screen rotation
    // If screen is rotated 90 deg, the "bottom" moves.
    let relativeAngle = deviceGravityAngle - screenRad;

    // Normalize to -PI to PI
    // We want the angle representing the "Surface Normal" or "Gravity Down"?
    // Let's output the angle the water surface should tilt.
    // If gravity is straight down (-Y), angle is PI.
    // If gravity is Left (-X), angle is -PI/2.
    
    // However, SimulationCanvas expects an angle where 0 is Flat.
    // If phone is upright (Gravity -Y), we want 0.
    // If phone tilts Right (Gravity -X), we want water to tilt Left (Positive angle?).
    
    // Let's refine the mapping for the Canvas:
    // Canvas Rotation: Positive = Clockwise.
    // If Phone tilts Right (Right side goes down), Gravity vector moves towards X+.
    // Water should tilt "Left" relative to screen to stay horizontal.
    
    // Let's just pass the raw gravity angle relative to Screen Down.
    // Screen Down Vector is (0, -1) in visual coords?
    
    // Simplified:
    // We just want to know how much to rotate the water graphics.
    // We want the water surface to be perpendicular to gravity.
    // Gravity Angle relative to Screen Up is `deviceGravityAngle - screenRad`.
    // Gravity points DOWN. Water surface is Perpendicular.
    // Surface Angle = Gravity Angle + PI/2.
    
    // Adjust logic to match Canvas expectations (0 = Horizontal)
    // Upright Phone: Gravity = (0, -9.8). Angle = -PI/2 (or 3PI/2 depending on atan2 convention).
    // Math.atan2(0, -9.8) -> PI (180deg). 
    // We want Result = 0. So result = Angle - PI.
    
    const calibratedAngle = relativeAngle - Math.PI;
    
    // Clamp/Wrap
    let finalTilt = calibratedAngle;
    while (finalTilt <= -Math.PI) finalTilt += 2 * Math.PI;
    while (finalTilt > Math.PI) finalTilt -= 2 * Math.PI;

    // Invert because canvas rotation is usually opposite to "leveling" logic?
    // If I tilt phone Right, Gravity moves Left relative to phone. 
    // Water surface should rotate Left (Negative) to stay flat.
    // Let's trust the vector math: finalTilt is the angle of the gravity vector relative to "Device Down".
    // Actually it's simpler:
    // We pass this angle to the canvas. The canvas renders the water at `-finalTilt`.
    
    setOrientation({
      tilt: finalTilt,
      rawX: x,
      rawY: y
    });
  }, []);

  const requestPermission = async () => {
    // iOS 13+ requires permission for DeviceMotion/Orientation
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceMotionEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setPermissionGranted(true);
          window.addEventListener('devicemotion', handleMotion);
        }
      } catch (error) {
        console.error("Permission denied", error);
      }
    } else {
      // Android / Older iOS / Desktop
      setPermissionGranted(true);
      window.addEventListener('devicemotion', handleMotion);
    }
  };

  // Mouse fallback for desktop
  useEffect(() => {
    if (isDesktop) {
      const handleMouseMove = (e: MouseEvent) => {
        const width = window.innerWidth;
        const normalizedX = (e.clientX / width) * 2 - 1; // -1 to 1
        // Simulate tilt angle
        setOrientation({
          tilt: normalizedX * (Math.PI / 4), // +/- 45 degrees
          rawX: 0,
          rawY: 0
        });
      };
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isDesktop]);

  return { orientation, requestPermission, permissionGranted, isDesktop };
};