import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';
import styles from './Canvas.module.css';

type Point = { x: number; y: number };

interface CanvasProps {
  canvasWidth: number;
  canvasHeight: number;
}

const ORIGIN = Object.freeze({ x: 0, y: 0 });

const { devicePixelRatio: ratio = 1 } = window;

const diffPoints = (a: Point, b: Point): Point => ({
  x: a.x - b.x,
  y: a.y - b.y
});

const distanceBetweenPoints = (a: Point, b: Point): number =>
  Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);

const addPoints = (a: Point, b: Point): Point => ({
  x: a.x + b.x,
  y: a.y + b.y
});

const averagePoints = (...points: Point[]): Point => ({
  x: points.reduce((acc, v) => acc + v.x, 0) / points.length,
  y: points.reduce((acc, v) => acc + v.y, 0) / points.length
});

const scalePoint = (a: Point, scalar: number): Point => ({
  x: a.x / scalar,
  y: a.y / scalar
});

const ZOOM_SENSITIVITY = 500;
const PINCH_SENSITIVITY = 200;

const Canvas = (props: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const isResetRef = useRef(false);

  const [scale, setScale] = useState(1);

  const [offset, setOffset] = useState<Point>(ORIGIN);
  const lastOffsetRef = useRef<Point>(ORIGIN);
  const [viewportTopLeft, setViewportTopLeft] = useState<Point>(ORIGIN);

  const [mousePos, setMousePos] = useState<Point>(ORIGIN);
  const lastMousePosRef = useRef<Point>(ORIGIN);

  useEffect(() => {
    lastOffsetRef.current = offset;
  }, [offset]);

  const reset = useCallback(
    (context: CanvasRenderingContext2D) => {
      if (context && !isResetRef.current) {
        context.canvas.width = props.canvasWidth * ratio;
        context.canvas.height = props.canvasHeight * ratio;
        context.scale(ratio, ratio);
        setScale(1);

        setContext(context);
        setOffset(ORIGIN);
        setMousePos(ORIGIN);
        setViewportTopLeft(ORIGIN);
        lastOffsetRef.current = ORIGIN;
        lastMousePosRef.current = ORIGIN;

        isResetRef.current = true;
      }
    },
    [props.canvasWidth, props.canvasHeight]
  );

  // run once after the component mounts
  useLayoutEffect(() => {
    if (canvasRef.current !== null) {
      const ctx = canvasRef.current.getContext('2d');

      if (ctx) reset(ctx);
    }
  }, [reset, props.canvasWidth, props.canvasHeight]);

  useLayoutEffect(() => {
    if (context) {
      const squareSize = 50;

      const storedTransform = context.getTransform();
      context.canvas.width = context.canvas.width;
      context.setTransform(storedTransform);

      context.fillRect(
        props.canvasWidth / 2 - squareSize / 2,
        props.canvasHeight / 2 - squareSize / 2,
        squareSize,
        squareSize
      );

      context.fillRect(props.canvasHeight - 10, props.canvasWidth - 10, 10, 10);
    }
  }, [
    props.canvasWidth,
    props.canvasHeight,
    context,
    scale,
    offset,
    viewportTopLeft
  ]);

  const mouseMove = useCallback(
    (e: globalThis.MouseEvent) => {
      if (context !== null) {
        const lastMousePos = lastMousePosRef.current;
        const currentMousePos: Point = { x: e.pageX, y: e.pageY };
        lastMousePosRef.current = currentMousePos;

        const mouseDiff = diffPoints(currentMousePos, lastMousePos);
        setOffset((prevOffset) => addPoints(prevOffset, mouseDiff));
      }
    },
    [context]
  );

  const mouseUp = useCallback(() => {
    document.removeEventListener('mousemove', mouseMove);
    document.removeEventListener('mouseup', mouseUp);
  }, [mouseMove]);

  const startPan = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      document.addEventListener('mousemove', mouseMove);
      document.addEventListener('mouseup', mouseUp);
      lastMousePosRef.current = { x: e.pageX, y: e.pageY };
    },
    [mouseMove, mouseUp]
  );

  const touchMove = useCallback(
    (e: globalThis.TouchEvent) => {
      if (context !== null) {
        const lastMousePos = lastMousePosRef.current;
        const currentMousePos: Point = {
          x: e.touches[0].pageX,
          y: e.touches[0].pageY
        };
        lastMousePosRef.current = currentMousePos;

        const touchDiff = diffPoints(currentMousePos, lastMousePos);
        setOffset((prevOffset) => addPoints(prevOffset, touchDiff));
      }
    },
    [context]
  );

  const touchEnd = useCallback(() => {
    document.removeEventListener('touchmove', touchMove);
    document.removeEventListener('touchend', touchEnd);
  }, [touchMove]);

  const handleTouch = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      document.addEventListener('touchmove', touchMove);
      document.addEventListener('touchend', touchEnd);
      if (e.touches.length === 1) {
        lastMousePosRef.current = {
          x: e.touches[0].pageX,
          y: e.touches[0].pageY
        };
      }
    },
    [touchMove, touchEnd]
  );

  useLayoutEffect(() => {
    if (context && lastOffsetRef.current) {
      const offsetDiff = scalePoint(
        diffPoints(offset, lastOffsetRef.current),
        scale
      );
      context.translate(offsetDiff.x, offsetDiff.y);
      setViewportTopLeft((prevVal) => diffPoints(prevVal, offsetDiff));
      isResetRef.current = false;
    }
  }, [context, offset, scale]);

  // add event listener on canvas for position relative to top left
  // of canvas element
  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (canvasElement === null) return;

    const handleUpdateMouse = (e: globalThis.MouseEvent) => {
      e.preventDefault();
      if (canvasRef.current !== null) {
        const viewportMousePos: Point = { x: e.clientX, y: e.clientY };
        const topLeftCanvasPos: Point = {
          x: canvasRef.current.offsetLeft,
          y: canvasRef.current.offsetTop
        };
        setMousePos(diffPoints(viewportMousePos, topLeftCanvasPos));
      }
    };

    canvasElement.addEventListener('mousemove', handleUpdateMouse);
    canvasElement.addEventListener('wheel', handleUpdateMouse);

    return () => {
      canvasElement.removeEventListener('mousemove', handleUpdateMouse);
      canvasElement.removeEventListener('wheel', handleUpdateMouse);
    };
  });

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (canvasElement === null) return;

    const handleWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      if (context !== null) {
        let zoom: number;
        if (e.ctrlKey) {
          zoom = 1 - e.deltaY / PINCH_SENSITIVITY;
        } else {
          zoom = 1 - e.deltaY / ZOOM_SENSITIVITY;
        }
        const viewportTopLeftDelta: Point = {
          x: (mousePos.x / scale) * (1 - 1 / zoom),
          y: (mousePos.y / scale) * (1 - 1 / zoom)
        };

        const newViewportTopLeft = addPoints(
          viewportTopLeft,
          viewportTopLeftDelta
        );

        context.translate(viewportTopLeft.x, viewportTopLeft.y);
        context.scale(zoom, zoom);
        context.translate(-newViewportTopLeft.x, -newViewportTopLeft.y);

        setViewportTopLeft(newViewportTopLeft);
        setScale(scale * zoom);
        isResetRef.current = false;
      }
    };

    canvasElement.addEventListener('wheel', handleWheel);
    return () => canvasElement.removeEventListener('wheel', handleWheel);
  }, [context, mousePos.x, mousePos.y, viewportTopLeft, scale]);

  return (
    <>
      <button onClick={() => context && reset(context)}>reset</button>
      <pre>scale: {scale.toFixed(2)}</pre>
      <pre>
        offset:{' '}
        {JSON.stringify(offset, (_, v) =>
          v.toFixed ? Number(v.toFixed(3)) : v
        )}
      </pre>
      <pre>
        mousePos:{' '}
        {JSON.stringify(mousePos, (_, v) =>
          v.toFixed ? Number(v.toFixed(3)) : v
        )}
      </pre>
      <pre>
        viewportTopLeft:{' '}
        {JSON.stringify(viewportTopLeft, (_, v) =>
          v.toFixed ? Number(v.toFixed(3)) : v
        )}
      </pre>
      <canvas
        ref={canvasRef}
        onMouseDown={startPan}
        onTouchStart={handleTouch}
        className={styles.root}
        width={props.canvasWidth * ratio}
        height={props.canvasHeight * ratio}
        style={{
          width: `${props.canvasWidth}px`,
          height: `${props.canvasHeight}px`
        }}
      />
    </>
  );
};

export default Canvas;
