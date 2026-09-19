/**
 * Helper to request camera stream with intelligent multi-stage fallback.
 * Prevents "Could not start video source" / OverconstrainedError on devices
 * without rear cameras, webcams in desktop environments, or iframe sandbox previews.
 */
export async function requestCameraStream(
  preferredFacingMode: 'environment' | 'user' = 'environment'
): Promise<MediaStream> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('Camera access API (getUserMedia) is not supported in this browser.');
  }

  const secondaryFacingMode = preferredFacingMode === 'environment' ? 'user' : 'environment';

  // Attempt 1: Preferred facing mode with flexible ideal dimensions
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: preferredFacingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
  } catch (e1) {
    console.warn(`Camera Attempt 1 (${preferredFacingMode} ideal) failed:`, e1);
  }

  // Attempt 2: Simple preferred facing mode
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: preferredFacingMode },
      audio: false,
    });
  } catch (e2) {
    console.warn(`Camera Attempt 2 (${preferredFacingMode} simple) failed:`, e2);
  }

  // Attempt 3: Secondary facing camera (Desktop Webcam or Front/Back alternate)
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: secondaryFacingMode },
      audio: false,
    });
  } catch (e3) {
    console.warn(`Camera Attempt 3 (${secondaryFacingMode} alternate) failed:`, e3);
  }

  // Attempt 4: Unconstrained video stream
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
  } catch (e4: any) {
    console.error('All camera request attempts failed:', e4);
    throw new Error(
      e4?.message || 'Could not start video source. Please grant camera permission or select a photo to upload.'
    );
  }
}

/**
 * Check if the device has multiple video cameras (e.g. front and rear on mobile/tablets)
 */
export async function checkHasMultipleCameras(): Promise<boolean> {
  try {
    if (!navigator?.mediaDevices?.enumerateDevices) return false;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === 'videoinput');
    return videoDevices.length > 1;
  } catch {
    return false;
  }
}

