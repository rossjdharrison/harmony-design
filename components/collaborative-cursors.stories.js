/**
 * @fileoverview Storybook stories for Collaborative Cursors Component
 * @module components/collaborative-cursors.stories
 */

import './collaborative-cursors.js';
import { EventBus } from '../core/EventBus.js';

export default {
  title: 'Collaboration/Collaborative Cursors',
  component: 'collaborative-cursors',
  parameters: {
    docs: {
      description: {
        component: 'Displays real-time cursor positions and text selections from other users in collaborative editing sessions.'
      }
    }
  }
};

/**
 * Default story showing multiple cursors
 */
export const Default = () => {
  const container = document.createElement('div');
  container.innerHTML = `
    <style>
      .demo-container {
        width: 100%;
        height: 600px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        position: relative;
        border-radius: 8px;
        overflow: hidden;
      }
      
      .demo-content {
        padding: 40px;
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
      }
      
      .demo-content h1 {
        font-size: 32px;
        margin-bottom: 20px;
      }
      
      .demo-content p {
        font-size: 18px;
        line-height: 1.6;
        max-width: 600px;
      }
      
      .controls {
        position: absolute;
        bottom: 20px;
        left: 20px;
        background: rgba(255, 255, 255, 0.9);
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .controls button {
        margin: 4px;
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        background: #667eea;
        color: white;
        cursor: pointer;
        font-size: 14px;
      }
      
      .controls button:hover {
        background: #5568d3;
      }
    </style>
    
    <div class="demo-container">
      <collaborative-cursors current-user-id="current-user"></collaborative-cursors>
      
      <div class="demo-content">
        <h1>Collaborative Document</h1>
        <p>
          This is a demonstration of the collaborative cursors component.
          You can see cursors and selections from other users in real-time.
          Move your mouse around to see how it would appear to others.
        </p>
      </div>
      
      <div class="controls">
        <button id="simulate-alice">Simulate Alice</button>
        <button id="simulate-bob">Simulate Bob</button>
        <button id="simulate-charlie">Simulate Charlie</button>
        <button id="clear-all">Clear All</button>
      </div>
    </div>
  `;

  // Simulate cursor movements
  const simulateCursor = (userId, userName, userColor, pattern) => {
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      
      let x, y;
      switch (pattern) {
        case 'circle':
          x = 300 + Math.cos(frame * 0.05) * 100;
          y = 200 + Math.sin(frame * 0.05) * 100;
          break;
        case 'diagonal':
          x = 100 + (frame * 3) % 500;
          y = 100 + (frame * 2) % 400;
          break;
        case 'random':
          x = Math.random() * 600 + 50;
          y = Math.random() * 400 + 50;
          break;
      }
      
      EventBus.publish('presence:cursor-move', {
        userId,
        userName,
        userColor,
        x,
        y
      });
      
      // Occasionally simulate selection
      if (frame % 60 === 0) {
        EventBus.publish('presence:selection-change', {
          userId,
          userName,
          userColor,
          bounds: {
            left: x,
            top: y + 30,
            width: 150,
            height: 20
          }
        });
      }
      
      if (frame > 200) {
        clearInterval(interval);
        EventBus.publish('presence:user-left', { userId });
      }
    }, 50);
  };

  // Button handlers
  setTimeout(() => {
    const aliceBtn = container.querySelector('#simulate-alice');
    const bobBtn = container.querySelector('#simulate-bob');
    const charlieBtn = container.querySelector('#simulate-charlie');
    const clearBtn = container.querySelector('#clear-all');
    const cursors = container.querySelector('collaborative-cursors');

    aliceBtn.addEventListener('click', () => {
      simulateCursor('alice', 'Alice', '#FF6B6B', 'circle');
    });

    bobBtn.addEventListener('click', () => {
      simulateCursor('bob', 'Bob', '#4ECDC4', 'diagonal');
    });

    charlieBtn.addEventListener('click', () => {
      simulateCursor('charlie', 'Charlie', '#FFA07A', 'random');
    });

    clearBtn.addEventListener('click', () => {
      cursors.clear();
    });
  }, 100);

  return container;
};

/**
 * Story showing cursor with text selection
 */
export const WithSelection = () => {
  const container = document.createElement('div');
  container.innerHTML = `
    <style>
      .selection-demo {
        width: 100%;
        height: 400px;
        background: white;
        position: relative;
        padding: 40px;
        font-family: system-ui, -apple-system, sans-serif;
      }
      
      .selection-demo p {
        font-size: 16px;
        line-height: 1.8;
        color: #333;
      }
    </style>
    
    <div class="selection-demo">
      <collaborative-cursors current-user-id="current-user"></collaborative-cursors>
      
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
      </p>
    </div>
  `;

  // Simulate selection
  setTimeout(() => {
    EventBus.publish('presence:cursor-move', {
      userId: 'user-1',
      userName: 'Sarah',
      userColor: '#45B7D1',
      x: 150,
      y: 120
    });

    EventBus.publish('presence:selection-change', {
      userId: 'user-1',
      userName: 'Sarah',
      userColor: '#45B7D1',
      bounds: {
        left: 150,
        top: 100,
        width: 300,
        height: 24
      }
    });
  }, 500);

  return container;
};

/**
 * Story showing performance with many cursors
 */
export const ManyUsers = () => {
  const container = document.createElement('div');
  container.innerHTML = `
    <style>
      .many-users-demo {
        width: 100%;
        height: 600px;
        background: #f5f5f5;
        position: relative;
      }
      
      .stats {
        position: absolute;
        top: 20px;
        right: 20px;
        background: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        font-family: monospace;
        font-size: 14px;
      }
    </style>
    
    <div class="many-users-demo">
      <collaborative-cursors current-user-id="current-user"></collaborative-cursors>
      
      <div class="stats">
        <div>Active Cursors: <span id="cursor-count">0</span></div>
        <div>FPS: <span id="fps">60</span></div>
      </div>
    </div>
  `;

  // Simulate many users
  setTimeout(() => {
    const cursors = container.querySelector('collaborative-cursors');
    const countEl = container.querySelector('#cursor-count');
    const fpsEl = container.querySelector('#fps');
    
    let lastTime = performance.now();
    let frames = 0;
    
    // Create 20 users with random movements
    for (let i = 0; i < 20; i++) {
      const userId = `user-${i}`;
      const userName = `User ${i}`;
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
      const userColor = colors[i % colors.length];
      
      setInterval(() => {
        const x = Math.random() * 800;
        const y = Math.random() * 500;
        
        EventBus.publish('presence:cursor-move', {
          userId,
          userName,
          userColor,
          x,
          y
        });
        
        frames++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
          fpsEl.textContent = Math.round(frames * 1000 / (now - lastTime));
          frames = 0;
          lastTime = now;
        }
        
        countEl.textContent = cursors.getCursorCount();
      }, 100 + Math.random() * 200);
    }
  }, 500);

  return container;
};

/**
 * Story showing cursor timeout behavior
 */
export const CursorTimeout = () => {
  const container = document.createElement('div');
  container.innerHTML = `
    <style>
      .timeout-demo {
        width: 100%;
        height: 400px;
        background: white;
        position: relative;
        padding: 40px;
      }
      
      .timeout-demo p {
        font-family: system-ui, -apple-system, sans-serif;
        color: #666;
      }
    </style>
    
    <div class="timeout-demo">
      <collaborative-cursors current-user-id="current-user"></collaborative-cursors>
      
      <p>
        Cursors automatically fade out after 5 seconds of inactivity.
        Watch the cursor below disappear after a few seconds.
      </p>
    </div>
  `;

  // Show cursor that will timeout
  setTimeout(() => {
    EventBus.publish('presence:cursor-move', {
      userId: 'timeout-user',
      userName: 'Inactive User',
      userColor: '#BB8FCE',
      x: 200,
      y: 150
    });
  }, 500);

  return container;
};