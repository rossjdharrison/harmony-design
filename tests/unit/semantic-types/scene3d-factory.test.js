/**
 * Scene3D Factory Tests
 * 
 * @see {@link file://./../../../core/semantic-types/scene3d-factory.js}
 */

import { 
  createScene3D, 
  isScene3D, 
  updateScene3DSpatial,
  addScene3DChild,
  removeScene3DChild
} from '../../../core/semantic-types/scene3d-factory.js';

describe('Scene3D Factory', () => {
  describe('createScene3D', () => {
    it('should create Scene3D with default values', () => {
      const scene = createScene3D();
      
      expect(scene.semantic_type).toBe('Scene3D');
      expect(scene.spatial.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(scene.spatial.rotation).toEqual({ x: 0, y: 0, z: 0 });
      expect(scene.spatial.scale).toEqual({ x: 1, y: 1, z: 1 });
      expect(scene.scene_properties.background_color).toBe('#000000');
      expect(scene.children).toEqual([]);
    });

    it('should override spatial properties', () => {
      const scene = createScene3D({
        spatial: {
          position: { x: 10, y: 20, z: 30 }
        }
      });
      
      expect(scene.spatial.position).toEqual({ x: 10, y: 20, z: 30 });
      expect(scene.spatial.rotation).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('should override scene properties', () => {
      const scene = createScene3D({
        scene_properties: {
          background_color: '#1A1A1A',
          camera: { fov: 60 }
        }
      });
      
      expect(scene.scene_properties.background_color).toBe('#1A1A1A');
      expect(scene.scene_properties.camera.fov).toBe(60);
      expect(scene.scene_properties.camera.near).toBe(0.1);
    });
  });

  describe('isScene3D', () => {
    it('should validate correct Scene3D', () => {
      const scene = createScene3D();
      expect(isScene3D(scene)).toBe(true);
    });

    it('should reject invalid semantic_type', () => {
      const invalid = { semantic_type: 'NotScene3D' };
      expect(isScene3D(invalid)).toBe(false);
    });

    it('should reject missing spatial', () => {
      const invalid = { semantic_type: 'Scene3D' };
      expect(isScene3D(invalid)).toBe(false);
    });

    it('should reject invalid spatial vectors', () => {
      const invalid = {
        semantic_type: 'Scene3D',
        spatial: {
          position: { x: 0, y: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        }
      };
      expect(isScene3D(invalid)).toBe(false);
    });

    it('should reject null', () => {
      expect(isScene3D(null)).toBe(false);
    });

    it('should reject non-objects', () => {
      expect(isScene3D('Scene3D')).toBe(false);
      expect(isScene3D(123)).toBe(false);
    });
  });

  describe('updateScene3DSpatial', () => {
    it('should update position', () => {
      const scene = createScene3D();
      const updated = updateScene3DSpatial(scene, {
        position: { x: 5, y: 10, z: 15 }
      });
      
      expect(updated.spatial.position).toEqual({ x: 5, y: 10, z: 15 });
      expect(updated.spatial.rotation).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('should partially update position', () => {
      const scene = createScene3D();
      const updated = updateScene3DSpatial(scene, {
        position: { x: 5 }
      });
      
      expect(updated.spatial.position).toEqual({ x: 5, y: 0, z: 0 });
    });

    it('should not mutate original', () => {
      const scene = createScene3D();
      const updated = updateScene3DSpatial(scene, {
        position: { x: 5 }
      });
      
      expect(scene.spatial.position.x).toBe(0);
      expect(updated.spatial.position.x).toBe(5);
    });
  });

  describe('addScene3DChild', () => {
    it('should add child', () => {
      const scene = createScene3D();
      const updated = addScene3DChild(scene, 'child-1');
      
      expect(updated.children).toEqual(['child-1']);
    });

    it('should add multiple children', () => {
      let scene = createScene3D();
      scene = addScene3DChild(scene, 'child-1');
      scene = addScene3DChild(scene, 'child-2');
      
      expect(scene.children).toEqual(['child-1', 'child-2']);
    });

    it('should not add duplicate child', () => {
      let scene = createScene3D();
      scene = addScene3DChild(scene, 'child-1');
      scene = addScene3DChild(scene, 'child-1');
      
      expect(scene.children).toEqual(['child-1']);
    });

    it('should not mutate original', () => {
      const scene = createScene3D();
      const updated = addScene3DChild(scene, 'child-1');
      
      expect(scene.children).toEqual([]);
      expect(updated.children).toEqual(['child-1']);
    });
  });

  describe('removeScene3DChild', () => {
    it('should remove child', () => {
      let scene = createScene3D();
      scene = addScene3DChild(scene, 'child-1');
      scene = addScene3DChild(scene, 'child-2');
      
      const updated = removeScene3DChild(scene, 'child-1');
      
      expect(updated.children).toEqual(['child-2']);
    });

    it('should handle non-existent child', () => {
      const scene = createScene3D();
      const updated = removeScene3DChild(scene, 'child-1');
      
      expect(updated.children).toEqual([]);
    });

    it('should not mutate original', () => {
      let scene = createScene3D();
      scene = addScene3DChild(scene, 'child-1');
      
      const updated = removeScene3DChild(scene, 'child-1');
      
      expect(scene.children).toEqual(['child-1']);
      expect(updated.children).toEqual([]);
    });
  });
});