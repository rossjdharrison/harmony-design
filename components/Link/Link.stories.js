/**
 * @fileoverview Storybook stories for Polymorphic Link Component
 * @module components/Link/Link.stories
 */

import './Link.js';

export default {
  title: 'Components/Link',
  component: 'harmony-link',
  parameters: {
    docs: {
      description: {
        component: 'A polymorphic link component that can render as either an anchor element or integrate with a router. Supports accessibility, security, and event publishing.'
      }
    }
  },
  argTypes: {
    href: {
      control: 'text',
      description: 'The URL to navigate to'
    },
    as: {
      control: 'select',
      options: ['a', 'router-link'],
      description: 'The element type to render as'
    },
    external: {
      control: 'boolean',
      description: 'Mark link as external'
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the link'
    },
    target: {
      control: 'select',
      options: ['', '_blank', '_self', '_parent', '_top'],
      description: 'The target attribute for anchor links'
    },
    text: {
      control: 'text',
      description: 'Link text content'
    }
  }
};

const Template = ({ href, as, external, disabled, target, text }) => {
  const link = document.createElement('harmony-link');
  link.href = href;
  if (as) link.as = as;
  if (external) link.external = true;
  if (disabled) link.disabled = true;
  if (target) link.setAttribute('target', target);
  link.textContent = text;
  return link;
};

export const Default = Template.bind({});
Default.args = {
  href: '/about',
  text: 'About Us',
  as: 'a'
};

export const RouterLink = Template.bind({});
RouterLink.args = {
  href: '/dashboard',
  text: 'Dashboard',
  as: 'router-link'
};
RouterLink.parameters = {
  docs: {
    description: {
      story: 'Router link for client-side navigation. Publishes router:navigate events.'
    }
  }
};

export const ExternalLink = Template.bind({});
ExternalLink.args = {
  href: 'https://example.com',
  text: 'External Site',
  external: true,
  as: 'a'
};
ExternalLink.parameters = {
  docs: {
    description: {
      story: 'External link with security attributes (noopener noreferrer) and visual indicator.'
    }
  }
};

export const TargetBlank = Template.bind({});
TargetBlank.args = {
  href: '/help',
  text: 'Open in New Tab',
  target: '_blank',
  as: 'a'
};
TargetBlank.parameters = {
  docs: {
    description: {
      story: 'Link that opens in a new tab with security attributes automatically applied.'
    }
  }
};

export const Disabled = Template.bind({});
Disabled.args = {
  href: '/admin',
  text: 'Admin Panel (No Access)',
  disabled: true,
  as: 'a'
};
Disabled.parameters = {
  docs: {
    description: {
      story: 'Disabled link that cannot be clicked and has visual styling to indicate unavailability.'
    }
  }
};

export const DisabledRouter = Template.bind({});
DisabledRouter.args = {
  href: '/settings',
  text: 'Settings (Disabled)',
  disabled: true,
  as: 'router-link'
};

export const InteractiveDemo = () => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.fontFamily = 'system-ui, sans-serif';

  container.innerHTML = `
    <h3>Link Variations</h3>
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <div>
        <strong>Standard Anchor:</strong><br>
        <harmony-link href="/about">About Us</harmony-link>
      </div>
      
      <div>
        <strong>Router Link:</strong><br>
        <harmony-link href="/dashboard" as="router-link">Dashboard</harmony-link>
      </div>
      
      <div>
        <strong>External Link:</strong><br>
        <harmony-link href="https://example.com" external>Example.com</harmony-link>
      </div>
      
      <div>
        <strong>New Tab:</strong><br>
        <harmony-link href="/help" target="_blank">Help (New Tab)</harmony-link>
      </div>
      
      <div>
        <strong>Disabled:</strong><br>
        <harmony-link href="/admin" disabled>Admin Panel</harmony-link>
      </div>
    </div>

    <div style="margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 4px;">
      <strong>Event Log:</strong>
      <div id="event-log" style="margin-top: 10px; font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto;"></div>
    </div>
  `;

  const eventLog = container.querySelector('#event-log');

  // Listen for navigation events
  container.addEventListener('harmony:navigation', (e) => {
    const entry = document.createElement('div');
    entry.style.padding = '4px 0';
    entry.style.borderBottom = '1px solid #ddd';
    entry.textContent = `[Navigation] ${e.detail.type}: ${e.detail.href} (external: ${e.detail.external})`;
    eventLog.prepend(entry);
  });

  container.addEventListener('harmony:router:navigate', (e) => {
    const entry = document.createElement('div');
    entry.style.padding = '4px 0';
    entry.style.borderBottom = '1px solid #ddd';
    entry.style.color = '#0066cc';
    entry.textContent = `[Router] Navigate to: ${e.detail.href}`;
    eventLog.prepend(entry);
  });

  return container;
};
InteractiveDemo.parameters = {
  docs: {
    description: {
      story: 'Interactive demonstration of all link variations with event logging.'
    }
  }
};