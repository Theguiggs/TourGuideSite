import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneSidebarItem } from '../SceneSidebarItem';

describe('SceneSidebarItem', () => {
  it("rend numéro et titre", () => {
    render(<SceneSidebarItem index={1} title="Scène A" status="finalized" isActive={false} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Scène A')).toBeInTheDocument();
  });

  it("affiche aria-current 'true' quand actif", () => {
    render(<SceneSidebarItem index={1} title="x" status="finalized" isActive />);
    expect(screen.getByTestId('scene-sidebar-item')).toHaveAttribute('aria-current', 'true');
  });

  it("appelle onClick", () => {
    const onClick = jest.fn();
    render(<SceneSidebarItem index={1} title="x" status="finalized" isActive={false} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('scene-sidebar-item'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("affiche le label de status (Finalisé)", () => {
    render(<SceneSidebarItem index={1} title="x" status="finalized" isActive={false} />);
    expect(screen.getByText('Finalisé')).toBeInTheDocument();
  });

  it("status 'recorded' affiche 'Enregistré'", () => {
    render(<SceneSidebarItem index={1} title="x" status="recorded" isActive={false} />);
    expect(screen.getByText('Enregistré')).toBeInTheDocument();
  });
});
