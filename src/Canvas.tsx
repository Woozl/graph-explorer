import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  WheelEvent
} from 'react';
import styles from './Canvas.module.css';

const TOUCHPAD_ZOOM_SENS = 200;
const TOUCHPAD_PAN_SENS = 1;
const ORIGIN: Point = { x: 0, y: 0 };

type Point = { x: number; y: number };
interface Camera {
  x: number;
  y: number;
  z: number;
}

interface Box {
  topLeft: Point;
  bottomRight: Point;
  width: number;
  height: number;
}

const screenToCanvas = (point: Point, camera: Camera): Point => ({
  x: point.x / camera.z - camera.x,
  y: point.y / camera.z - camera.y
});

const canvasToScreen = (point: Point, camera: Camera): Point => ({
  x: (point.x + camera.x) * camera.z,
  y: (point.y + camera.y) * camera.z
});

const getViewport = (camera: Camera, box: Box): Box => {
  const topLeftCanvas = screenToCanvas(box.topLeft, camera);
  const bottomRightCanvas = screenToCanvas(box.bottomRight, camera);

  return {
    topLeft: topLeftCanvas,
    bottomRight: bottomRightCanvas,
    width: bottomRightCanvas.x - topLeftCanvas.x,
    height: bottomRightCanvas.y - topLeftCanvas.y
  };
};

const panCamera = (camera: Camera, dx: number, dy: number): Camera => ({
  x: camera.x - dx / camera.z,
  y: camera.y - dy / camera.z,
  z: camera.z
});

const zoomCamera = (camera: Camera, point: Point, dz: number): Camera => {
  const zoom = camera.z - dz * camera.z;
  const p1 = screenToCanvas(point, camera);
  const p2 = screenToCanvas(point, { ...camera, z: zoom });

  return {
    x: camera.x + (p2.x - p1.x),
    y: camera.y + (p2.y - p1.y),
    z: zoom
  };
};

const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [camera, setCamera] = useState<Camera>({ ...ORIGIN, z: 1 });

  useLayoutEffect(() => {
    const handleWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();

      const { clientX: x, clientY: y, deltaX, deltaY, ctrlKey } = e;

      if (ctrlKey) {
        setCamera((camera) =>
          zoomCamera(camera, { x, y }, deltaY / TOUCHPAD_ZOOM_SENS)
        );
      } else {
        setCamera((camera) =>
          panCamera(
            camera,
            deltaX * TOUCHPAD_PAN_SENS,
            deltaY * TOUCHPAD_PAN_SENS
          )
        );
      }
    };

    let canvasEl: HTMLCanvasElement | null = null;
    if (canvasRef.current) {
      canvasEl = canvasRef.current;

      canvasEl.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => canvasEl?.removeEventListener('wheel', handleWheel);
  }, [canvasRef]);

  const viewport = getViewport(camera, {
    topLeft: ORIGIN,
    bottomRight: { x: window.innerWidth, y: window.innerHeight },
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    if (canvasRef.current !== null) {
      const canvas = canvasRef.current;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }, []);

  useEffect(() => {
    if (canvasRef.current !== null) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context !== null) {
        context.resetTransform();
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        context.scale(camera.z, camera.z);
        context.translate(camera.x, camera.y);

        context.fillRect(0, 0, 100, 100);
      }
    }
  });

  return (
    <>
      <canvas ref={canvasRef} className={styles.root} />
    </>
  );
};

export default Canvas;
