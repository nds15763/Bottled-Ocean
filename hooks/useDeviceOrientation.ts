import { useState, useEffect, useCallback } from 'react';

interface OrientationState {
  tilt: number; // Normalized tilt (-1 to 1) for landscape slide
  rawX: number;
  rawY: number;
}

export const useDeviceOrientation = () => {
  const [orientation, setOrientation] = useState<OrientationState>({ tilt: 0, rawX: 0, rawY: 0 });
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const { accelerationIncludingGravity } = event;
    if (!accelerationIncludingGravity) return;

    const x = accelerationIncludingGravity.x || 0;
    const y = accelerationIncludingGravity.y || 0;
    // const z = accelerationIncludingGravity.z || 0;

    // Simplified Logic for "Ship in a Bottle" (Landscape)
    // In forced landscape mode, the device's "Long Edge" is horizontal.
    // The accelerometer Y-axis runs along this long edge.
    // 
    // If the phone is flat on a table:
    // - Gravity is mostly Z (~9.8). X and Y are ~0.
    // - If we lift the left side (tilt right), Y becomes positive.
    // - If we lift the right side (tilt left), Y becomes negative.
    //
    // If the phone is held upright (Vertical Landscape):
    // - Gravity is mostly X (~9.8). Y is ~0.
    // - If we tilt left/right like a steering wheel, Y changes.
    //
    // Conclusion: 'y' acceleration is the robust measure for "Side-to-Side" tilt 
    // in Landscape mode, regardless of whether the phone is flat or upright.
    
    // Normalize by gravity (approx 9.8). Result is sin(angle).
    // Clamped to -1 to 1.
    let normalizedTilt = y / 9.8;
    
    // Invert sign if needed based on testing (Positive Y usually means tilting "Right" in landscape? depends on device rotation)
    // Let's assume standard behavior:
    // If I tilt phone to the RIGHT (lowering right side), mass should slide RIGHT.
    // On Android/iOS, if I tilt right, Y is usually NEGATIVE? 
    // Let's rely on user feedback loop. Previous feedback said "moves opposite".
    // We will pass raw normalized Y. SimulationCanvas applies force multiplier.
    
    // Clamp
    if (normalizedTilt > 1) normalizedTilt = 1;
    if (normalizedTilt < -1) normalizedTilt = -1;

    setOrientation({
      tilt: normalizedTilt,
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

  // Check if device orientation is likely supported (mobile)
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (!isMobile) {
      setIsDesktop(true);
    } else if (isAndroid) {
      // Android doesn't require permission for DeviceMotion, auto-enable
      setPermissionGranted(true);
      window.addEventListener('devicemotion', handleMotion);
    }
    // iOS: Permission will be requested on user interaction (startFocus or Zen Mode)
  }, [handleMotion]);

  // Mouse fallback for desktop
  useEffect(() => {
    if (isDesktop) {
      const handleMouseMove = (e: MouseEvent) => {
        const width = window.innerWidth;
        const normalizedX = (e.clientX / width) * 2 - 1; // -1 to 1
        // Simulate tilt angle
        setOrientation({
          tilt: normalizedX,
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
