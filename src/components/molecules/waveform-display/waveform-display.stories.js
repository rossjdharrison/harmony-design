/**
 * Waveform Display Component Stories
 * 
 * Demonstrates audio waveform visualization.
 * Tests: different waveforms, zoom levels, playback position.
 * Performance: Canvas rendering must stay under 16ms per frame.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#waveform-display
 */

import './waveform-display.js';

export default {
  title: 'Molecules/Waveform Display',
  component: 'harmony-waveform-display',
  tags: ['autodocs'],
  argTypes: {
    width: {
      control: 'number',
      description: 'Canvas width in pixels'
    },
    height: {
      control: 'number',
      description: 'Canvas height in pixels'
    },
    playbackPosition: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Playback position (0-1)'
    }
  }
};

/**
 * Default waveform display
 */
export const Default = {
  args: {
    width: 800,
    height: 200,
    playbackPosition: 0.3
  },
  render: (args) => {
    const waveform = document.createElement('harmony-waveform-display');
    waveform.setAttribute('width', args.width);
    waveform.setAttribute('height', args.height);
    waveform.setAttribute('playback-position', args.playbackPosition);
    
    // Simulate waveform data
    const mockData = new Float32Array(1024);
    for (let i = 0; i < mockData.length; i++) {
      mockData[i] = Math.sin(i / 10) * Math.random() * 0.8;
    }
    waveform.setWaveformData(mockData);
    
    return waveform;
  }
};

/**
 * Different waveform types
 */
export const WaveformTypes = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '2rem';
    
    const types = [
      { name: 'Sine Wave', generator: (i) => Math.sin(i / 20) },
      { name: 'Square Wave', generator: (i) => Math.sin(i / 20) > 0 ? 1 : -1 },
      { name: 'Sawtooth Wave', generator: (i) => (i % 40) / 20 - 1 },
      { name: 'Noise', generator: () => Math.random() * 2 - 1 }
    ];
    
    types.forEach(({ name, generator }) => {
      const wrapper = document.createElement('div');
      
      const label = document.createElement('h3');
      label.textContent = name;
      label.style.margin = '0 0 0.5rem 0';
      
      const waveform = document.createElement('harmony-waveform-display');
      waveform.setAttribute('width', '600');
      waveform.setAttribute('height', '150');
      
      const data = new Float32Array(1024);
      for (let i = 0; i < data.length; i++) {
        data[i] = generator(i) * 0.8;
      }
      waveform.setWaveformData(data);
      
      wrapper.appendChild(label);
      wrapper.appendChild(waveform);
      container.appendChild(wrapper);
    });
    
    return container;
  }
};

/**
 * Interactive playback position
 */
export const InteractivePlayback = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '1rem';
    
    const waveform = document.createElement('harmony-waveform-display');
    waveform.setAttribute('width', '800');
    waveform.setAttribute('height', '200');
    
    // Generate sample data
    const data = new Float32Array(1024);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.sin(i / 15) * Math.cos(i / 30) * 0.8;
    }
    waveform.setWaveformData(data);
    
    // Playback controls
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '1rem';
    controls.style.alignItems = 'center';
    
    const playButton = document.createElement('harmony-button');
    playButton.textContent = 'Play';
    
    const positionSlider = document.createElement('harmony-slider');
    positionSlider.setAttribute('label', 'Position');
    positionSlider.setAttribute('min', '0');
    positionSlider.setAttribute('max', '100');
    positionSlider.setAttribute('value', '0');
    positionSlider.style.flex = '1';
    
    let isPlaying = false;
    let animationId = null;
    
    playButton.addEventListener('click', () => {
      isPlaying = !isPlaying;
      playButton.textContent = isPlaying ? 'Pause' : 'Play';
      
      if (isPlaying) {
        const animate = () => {
          let pos = parseFloat(positionSlider.getAttribute('value'));
          pos += 0.5;
          if (pos > 100) pos = 0;
          
          positionSlider.setAttribute('value', pos);
          waveform.setAttribute('playback-position', pos / 100);
          
          if (isPlaying) {
            animationId = requestAnimationFrame(animate);
          }
        };
        animate();
      } else {
        if (animationId) cancelAnimationFrame(animationId);
      }
    });
    
    positionSlider.addEventListener('change', (e) => {
      waveform.setAttribute('playback-position', e.detail.value / 100);
    });
    
    controls.appendChild(playButton);
    controls.appendChild(positionSlider);
    
    container.appendChild(waveform);
    container.appendChild(controls);
    
    return container;
  }
};

/**
 * Zoom levels demonstration
 */
export const ZoomLevels = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '2rem';
    
    const zoomLevels = [
      { name: '1x (Full)', samples: 1024 },
      { name: '2x Zoom', samples: 512 },
      { name: '4x Zoom', samples: 256 }
    ];
    
    zoomLevels.forEach(({ name, samples }) => {
      const wrapper = document.createElement('div');
      
      const label = document.createElement('h3');
      label.textContent = name;
      label.style.margin = '0 0 0.5rem 0';
      
      const waveform = document.createElement('harmony-waveform-display');
      waveform.setAttribute('width', '800');
      waveform.setAttribute('height', '150');
      
      const data = new Float32Array(samples);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.sin(i / 10) * 0.8;
      }
      waveform.setWaveformData(data);
      
      wrapper.appendChild(label);
      wrapper.appendChild(waveform);
      container.appendChild(wrapper);
    });
    
    return container;
  }
};