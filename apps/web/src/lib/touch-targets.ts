/**
 * Touch Target Utilities
 * Ensures minimum 44x44px touch targets for accessibility
 * Requirements: 8.8
 */

/**
 * Minimum touch target size in pixels (WCAG 2.5.5)
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * CSS class names for touch target optimization
 */
export const touchTargetClasses = {
  /** Minimum 44x44px touch target */
  base: 'min-h-[44px] min-w-[44px]',
  /** Touch target with padding for smaller visual elements */
  padded: 'p-2 -m-2',
  /** Inline touch target (for text links) */
  inline: 'py-2 -my-2',
  /** Icon button touch target */
  icon: 'h-11 w-11 flex items-center justify-center',
  /** List item touch target */
  listItem: 'min-h-[44px] py-3',
} as const;

/**
 * Check if an element meets minimum touch target requirements
 */
export function checkTouchTarget(element: HTMLElement): {
  isValid: boolean;
  width: number;
  height: number;
  issues: string[];
} {
  const rect = element.getBoundingClientRect();
  const issues: string[] = [];

  if (rect.width < MIN_TOUCH_TARGET_SIZE) {
    issues.push(`Width ${rect.width}px is below minimum ${MIN_TOUCH_TARGET_SIZE}px`);
  }

  if (rect.height < MIN_TOUCH_TARGET_SIZE) {
    issues.push(`Height ${rect.height}px is below minimum ${MIN_TOUCH_TARGET_SIZE}px`);
  }

  return {
    isValid: issues.length === 0,
    width: rect.width,
    height: rect.height,
    issues,
  };
}

/**
 * Audit all interactive elements on the page for touch target compliance
 * Use in development only
 */
export function auditTouchTargets(): {
  total: number;
  passing: number;
  failing: { element: HTMLElement; issues: string[] }[];
} {
  if (typeof document === 'undefined') {
    return { total: 0, passing: 0, failing: [] };
  }

  const interactiveSelectors = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="tab"]',
    '[tabindex]:not([tabindex="-1"])',
  ];

  const elements = document.querySelectorAll<HTMLElement>(interactiveSelectors.join(', '));
  const failing: { element: HTMLElement; issues: string[] }[] = [];

  elements.forEach((element) => {
    // Skip hidden elements
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return;
    }

    const result = checkTouchTarget(element);
    if (!result.isValid) {
      failing.push({ element, issues: result.issues });
    }
  });

  return {
    total: elements.length,
    passing: elements.length - failing.length,
    failing,
  };
}
