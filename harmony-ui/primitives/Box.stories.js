/**
 * @fileoverview Storybook stories for Polymorphic Box Component
 * @module harmony-ui/primitives/Box.stories
 */

import './Box.js';

export default {
  title: 'Primitives/Box',
  component: 'harmony-box',
  parameters: {
    docs: {
      description: {
        component: 'A polymorphic container component that can render as any HTML element. Provides a foundation for building layout primitives with consistent spacing and styling via design tokens.'
      }
    }
  },
  argTypes: {
    as: {
      control: 'select',
      options: ['div', 'section', 'article', 'header', 'footer', 'nav', 'aside', 'main', 'span'],
      description: 'HTML element to render as',
      table: {
        defaultValue: { summary: 'div' }
      }
    },
    padding: {
      control: 'select',
      options: ['space-1', 'space-2', 'space-3', 'space-4', 'space-6', 'space-8'],
      description: 'Padding using design tokens'
    },
    margin: {
      control: 'select',
      options: ['space-1', 'space-2', 'space-3', 'space-4', 'space-6', 'space-8'],
      description: 'Margin using design tokens'
    },
    display: {
      control: 'select',
      options: ['block', 'flex', 'grid', 'inline-block', 'inline-flex'],
      description: 'CSS display property'
    },
    flexDirection: {
      control: 'select',
      options: ['row', 'column', 'row-reverse', 'column-reverse'],
      description: 'Flex direction (when display="flex")'
    },
    alignItems: {
      control: 'select',
      options: ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'],
      description: 'Align items on cross axis'
    },
    justifyContent: {
      control: 'select',
      options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
      description: 'Justify content on main axis'
    },
    gap: {
      control: 'select',
      options: ['space-1', 'space-2', 'space-3', 'space-4', 'space-6', 'space-8'],
      description: 'Gap between children'
    },
    background: {
      control: 'text',
      description: 'Background color (design token or CSS value)'
    },
    border: {
      control: 'text',
      description: 'Border (CSS value)'
    },
    borderRadius: {
      control: 'select',
      options: ['radius-sm', 'radius-md', 'radius-lg', 'radius-xl', 'radius-full'],
      description: 'Border radius using design tokens'
    }
  }
};

const Template = (args) => {
  const box = document.createElement('harmony-box');
  
  Object.entries(args).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      // Convert camelCase to kebab-case
      const attrName = key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
      box.setAttribute(attrName, value);
    }
  });
  
  box.innerHTML = args.content || 'Box content';
  
  return box;
};

export const Default = Template.bind({});
Default.args = {
  content: 'Default Box (renders as div)'
};

export const AsSection = Template.bind({});
AsSection.args = {
  as: 'section',
  padding: 'space-4',
  content: 'Rendered as <section> element'
};

export const FlexContainer = Template.bind({});
FlexContainer.args = {
  display: 'flex',
  gap: 'space-3',
  padding: 'space-4',
  background: '#f0f0f0',
  content: `
    <div style="padding: 1rem; background: white;">Item 1</div>
    <div style="padding: 1rem; background: white;">Item 2</div>
    <div style="padding: 1rem; background: white;">Item 3</div>
  `
};

export const FlexColumn = Template.bind({});
FlexColumn.args = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'space-2',
  padding: 'space-4',
  background: '#f0f0f0',
  content: `
    <div style="padding: 1rem; background: white;">Item 1</div>
    <div style="padding: 1rem; background: white;">Item 2</div>
    <div style="padding: 1rem; background: white;">Item 3</div>
  `
};

export const CenteredContent = Template.bind({});
CenteredContent.args = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'space-8',
  background: '#e0e0e0',
  content: '<div style="padding: 2rem; background: white;">Centered Content</div>'
};

export const WithBorder = Template.bind({});
WithBorder.args = {
  padding: 'space-4',
  border: '2px solid #333',
  borderRadius: 'radius-md',
  content: 'Box with border and border radius'
};

export const Card = Template.bind({});
Card.args = {
  as: 'article',
  padding: 'space-6',
  background: 'white',
  border: '1px solid #ddd',
  borderRadius: 'radius-lg',
  content: `
    <h3 style="margin: 0 0 1rem 0;">Card Title</h3>
    <p style="margin: 0;">This is a card-like component built using the polymorphic Box.</p>
  `
};

export const SemanticHeader = Template.bind({});
SemanticHeader.args = {
  as: 'header',
  padding: 'space-4',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#333',
  content: `
    <div style="color: white; font-weight: bold;">Logo</div>
    <nav style="color: white;">Navigation</nav>
  `
};

export const GridLayout = Template.bind({});
GridLayout.args = {
  display: 'grid',
  gap: 'space-4',
  padding: 'space-4',
  background: '#f0f0f0',
  content: `
    <div style="padding: 2rem; background: white;">Grid Item 1</div>
    <div style="padding: 2rem; background: white;">Grid Item 2</div>
    <div style="padding: 2rem; background: white;">Grid Item 3</div>
    <div style="padding: 2rem; background: white;">Grid Item 4</div>
  `
};

export const Composition = () => {
  const container = document.createElement('div');
  container.innerHTML = `
    <harmony-box as="main" padding="space-6">
      <harmony-box as="header" padding="space-4" background="#333" style="margin-bottom: 2rem;">
        <h1 style="color: white; margin: 0;">Polymorphic Box Composition</h1>
      </harmony-box>
      
      <harmony-box display="flex" gap="space-4">
        <harmony-box 
          as="aside" 
          padding="space-4" 
          background="#f0f0f0" 
          border-radius="radius-md"
          style="flex: 0 0 200px;">
          <p style="margin: 0;">Sidebar</p>
        </harmony-box>
        
        <harmony-box 
          as="article" 
          padding="space-6" 
          background="white" 
          border="1px solid #ddd"
          border-radius="radius-lg"
          style="flex: 1;">
          <h2 style="margin-top: 0;">Main Content</h2>
          <p>Multiple Box components composed together to create a layout.</p>
        </harmony-box>
      </harmony-box>
      
      <harmony-box 
        as="footer" 
        padding="space-4" 
        background="#f0f0f0" 
        style="margin-top: 2rem; text-align: center;">
        <p style="margin: 0;">Footer Content</p>
      </harmony-box>
    </harmony-box>
  `;
  
  return container;
};
Composition.parameters = {
  docs: {
    description: {
      story: 'Example of composing multiple Box components to create a complete layout with semantic HTML elements.'
    }
  }
};