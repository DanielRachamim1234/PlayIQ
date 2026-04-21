export async function recordCanvas(
  element: HTMLElement,
  durationSeconds: number,
  fps: number = 10
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create a temporary canvas for recording
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Set canvas dimensions to match element
      const rect = element.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Create stream from canvas
      const stream = canvas.captureStream(fps);
      
      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8' // Use vp8 for better compatibility
      });
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };
      
      mediaRecorder.onerror = reject;
      
      // Start recording
      mediaRecorder.start();
      
      // Function to capture and draw frames
      const captureFrames = async () => {
        const totalFrames = durationSeconds * fps;
        const interval = 1000 / fps;
        
        for (let i = 0; i < totalFrames; i++) {
          // Capture current state of element
          const { default: html2canvas } = await import('html2canvas');
          const screenshot = await html2canvas(element, {
            useCORS: true,
            allowTaint: true,
            scale: 1
          });
          
          // Draw to recording canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(screenshot, 0, 0);
          
          // Wait for next frame
          if (i < totalFrames - 1) {
            await new Promise(resolve => setTimeout(resolve, interval));
          }
        }
        
        // Stop recording
        mediaRecorder.stop();
      };
      
      // Start capturing frames
      captureFrames();
      
    } catch (error) {
      reject(error);
    }
  });
}