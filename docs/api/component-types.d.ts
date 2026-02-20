/**
 * Component API Type Definitions
 * Auto-generated type definitions for Harmony Design System components
 * 
 * @module ComponentTypes
 */

declare namespace HarmonyComponents {
  // Common Types
  type Size = 'small' | 'medium' | 'large';
  type Placement = 'top' | 'bottom' | 'left' | 'right';
  type Variant = 'primary' | 'secondary' | 'tertiary';
  type Color = 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

  // Event Base
  interface BaseEvent {
    timestamp: number;
  }

  // Button Component
  interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
    size?: Size;
    disabled?: boolean;
    loading?: boolean;
    icon?: string;
    'icon-position'?: 'left' | 'right';
    'full-width'?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }

  interface ButtonClickEvent extends BaseEvent {
    target: HTMLElement;
  }

  interface ButtonElement extends HTMLElement {
    variant: ButtonProps['variant'];
    size: ButtonProps['size'];
    disabled: boolean;
    loading: boolean;
    icon: string | null;
    iconPosition: 'left' | 'right';
    fullWidth: boolean;
    type: ButtonProps['type'];
    
    addEventListener(type: 'harmony-click', listener: (event: CustomEvent<ButtonClickEvent>) => void): void;
    addEventListener(type: 'harmony-focus', listener: (event: CustomEvent<BaseEvent>) => void): void;
    addEventListener(type: 'harmony-blur', listener: (event: CustomEvent<BaseEvent>) => void): void;
  }

  // Input Component
  interface InputProps {
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
    value?: string;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    error?: string;
    'helper-text'?: string;
    min?: number;
    max?: number;
    maxlength?: number;
    pattern?: string;
    autocomplete?: string;
  }

  interface InputChangeEvent extends BaseEvent {
    value: string;
  }

  interface InputValidationEvent extends BaseEvent {
    valid: boolean;
    error: string | null;
  }

  interface InputElement extends HTMLElement {
    type: InputProps['type'];
    value: string;
    placeholder: string;
    label: string | null;
    disabled: boolean;
    readonly: boolean;
    required: boolean;
    error: string | null;
    helperText: string | null;
    
    addEventListener(type: 'harmony-input', listener: (event: CustomEvent<InputChangeEvent>) => void): void;
    addEventListener(type: 'harmony-change', listener: (event: CustomEvent<InputChangeEvent>) => void): void;
    addEventListener(type: 'harmony-validation', listener: (event: CustomEvent<InputValidationEvent>) => void): void;
  }

  // Card Component
  interface CardProps {
    variant?: 'elevated' | 'outlined' | 'filled';
    padding?: 'none' | 'small' | 'medium' | 'large';
    clickable?: boolean;
    disabled?: boolean;
    loading?: boolean;
  }

  interface CardElement extends HTMLElement {
    variant: CardProps['variant'];
    padding: CardProps['padding'];
    clickable: boolean;
    disabled: boolean;
    loading: boolean;
    
    addEventListener(type: 'harmony-click', listener: (event: CustomEvent<ButtonClickEvent>) => void): void;
  }

  // Modal Component
  interface ModalProps {
    open?: boolean;
    size?: 'small' | 'medium' | 'large' | 'fullscreen';
    closable?: boolean;
    'close-on-backdrop'?: boolean;
    'close-on-escape'?: boolean;
    persistent?: boolean;
    title?: string;
    loading?: boolean;
  }

  interface ModalCloseEvent extends BaseEvent {
    reason: 'button' | 'backdrop' | 'escape';
  }

  interface ModalBeforeCloseEvent extends BaseEvent {
    reason: string;
    preventDefault: () => void;
  }

  interface ModalElement extends HTMLElement {
    open: boolean;
    size: ModalProps['size'];
    closable: boolean;
    closeOnBackdrop: boolean;
    closeOnEscape: boolean;
    persistent: boolean;
    title: string | null;
    loading: boolean;
    
    addEventListener(type: 'harmony-open', listener: (event: CustomEvent<BaseEvent>) => void): void;
    addEventListener(type: 'harmony-close', listener: (event: CustomEvent<ModalCloseEvent>) => void): void;
    addEventListener(type: 'harmony-before-close', listener: (event: CustomEvent<ModalBeforeCloseEvent>) => void): void;
  }

  // Dropdown Component
  interface DropdownProps {
    open?: boolean;
    placement?: Placement;
    trigger?: 'click' | 'hover' | 'focus';
    disabled?: boolean;
    'close-on-select'?: boolean;
    offset?: number;
  }

  interface DropdownSelectEvent extends BaseEvent {
    value: any;
    label: string;
  }

  interface DropdownElement extends HTMLElement {
    open: boolean;
    placement: Placement;
    trigger: DropdownProps['trigger'];
    disabled: boolean;
    closeOnSelect: boolean;
    offset: number;
    
    addEventListener(type: 'harmony-select', listener: (event: CustomEvent<DropdownSelectEvent>) => void): void;
  }

  // Tabs Component
  interface TabsProps {
    'active-tab'?: string;
    orientation?: 'horizontal' | 'vertical';
    variant?: 'default' | 'pills' | 'underline';
    disabled?: boolean;
  }

  interface TabChangeEvent extends BaseEvent {
    tabId: string;
    previousTabId: string;
  }

  interface TabsElement extends HTMLElement {
    activeTab: string | null;
    orientation: TabsProps['orientation'];
    variant: TabsProps['variant'];
    disabled: boolean;
    
    addEventListener(type: 'harmony-tab-change', listener: (event: CustomEvent<TabChangeEvent>) => void): void;
  }

  // Slider Component
  interface SliderProps {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    label?: string;
    'show-value'?: boolean;
    'show-ticks'?: boolean;
    vertical?: boolean;
  }

  interface SliderChangeEvent extends BaseEvent {
    value: number;
  }

  interface SliderElement extends HTMLElement {
    value: number;
    min: number;
    max: number;
    step: number;
    disabled: boolean;
    label: string | null;
    showValue: boolean;
    showTicks: boolean;
    vertical: boolean;
    
    addEventListener(type: 'harmony-input', listener: (event: CustomEvent<SliderChangeEvent>) => void): void;
    addEventListener(type: 'harmony-change', listener: (event: CustomEvent<SliderChangeEvent>) => void): void;
  }

  // Toggle Component
  interface ToggleProps {
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    size?: Size;
    'label-position'?: 'left' | 'right';
  }

  interface ToggleChangeEvent extends BaseEvent {
    checked: boolean;
  }

  interface ToggleElement extends HTMLElement {
    checked: boolean;
    disabled: boolean;
    label: string | null;
    size: Size;
    labelPosition: 'left' | 'right';
    
    addEventListener(type: 'harmony-change', listener: (event: CustomEvent<ToggleChangeEvent>) => void): void;
  }

  // Tooltip Component
  interface TooltipProps {
    content?: string;
    placement?: Placement;
    trigger?: 'hover' | 'focus' | 'click';
    delay?: number;
    disabled?: boolean;
    'max-width'?: string;
  }

  interface TooltipElement extends HTMLElement {
    content: string | null;
    placement: Placement;
    trigger: TooltipProps['trigger'];
    delay: number;
    disabled: boolean;
    maxWidth: string;
    
    addEventListener(type: 'harmony-show', listener: (event: CustomEvent<BaseEvent>) => void): void;
    addEventListener(type: 'harmony-hide', listener: (event: CustomEvent<BaseEvent>) => void): void;
  }

  // Progress Component
  interface ProgressProps {
    value?: number;
    variant?: 'linear' | 'circular';
    size?: Size;
    indeterminate?: boolean;
    label?: string;
    'show-value'?: boolean;
    color?: Color;
  }

  interface ProgressElement extends HTMLElement {
    value: number;
    variant: ProgressProps['variant'];
    size: Size;
    indeterminate: boolean;
    label: string | null;
    showValue: boolean;
    color: Color;
    
    addEventListener(type: 'harmony-complete', listener: (event: CustomEvent<BaseEvent>) => void): void;
    addEventListener(type: 'harmony-change', listener: (event: CustomEvent<SliderChangeEvent>) => void): void;
  }
}

// Global declarations for custom elements
declare global {
  interface HTMLElementTagNameMap {
    'harmony-button': HarmonyComponents.ButtonElement;
    'harmony-input': HarmonyComponents.InputElement;
    'harmony-card': HarmonyComponents.CardElement;
    'harmony-modal': HarmonyComponents.ModalElement;
    'harmony-dropdown': HarmonyComponents.DropdownElement;
    'harmony-tabs': HarmonyComponents.TabsElement;
    'harmony-slider': HarmonyComponents.SliderElement;
    'harmony-toggle': HarmonyComponents.ToggleElement;
    'harmony-tooltip': HarmonyComponents.TooltipElement;
    'harmony-progress': HarmonyComponents.ProgressElement;
  }
}

export { HarmonyComponents };