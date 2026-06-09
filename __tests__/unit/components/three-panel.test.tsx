import { describe, it, expect } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { ThreePanel } from '@/components/layout/three-panel';

describe('ThreePanel', () => {
  it('renders all three panels', () => {
    render(<ThreePanel sidebar={<div>Sidebar</div>} main={<div>Main</div>} workspace={<div>Workspace</div>} />);
    expect(screen.getByTestId('panel-sidebar')).toBeDefined();
    expect(screen.getByTestId('panel-main')).toBeDefined();
    expect(screen.getByTestId('panel-workspace')).toBeDefined();
  });

  it('hides workspace panel when workspaceOpen=false', () => {
    render(
      <ThreePanel
        sidebar={<div>Sidebar</div>}
        main={<div>Main</div>}
        workspace={<div>Workspace content</div>}
        workspaceOpen={false}
      />,
    );
    expect(screen.queryByTestId('panel-workspace')).toBeNull();
  });
});
