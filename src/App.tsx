import { useState } from 'react';
import './App.css';
import Canvas from './Canvas';

function App() {
  return (
    <div className='App'>
      <Canvas>
        <ellipse
          cx='100'
          cy='50'
          rx='100'
          ry='50'
          onMouseDown={(e) => e.currentTarget.setAttribute('fill', 'red')}
          onMouseUp={(e) =>
            e.currentTarget.setAttribute('fill', 'black')
          }></ellipse>
      </Canvas>
    </div>
  );
}

export default App;
