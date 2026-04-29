import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageStatusRow } from '../LanguageStatusRow';

describe('LanguageStatusRow', () => {
  it("rend code, label et stats", () => {
    render(
      <LanguageStatusRow
        code="fr"
        label="FR (source)"
        status="draft"
        scenesCount="6/6"
        audioCount="6/6"
        wordsCount={219}
      />,
    );
    expect(screen.getByText('FR')).toBeInTheDocument();
    expect(screen.getByText('FR (source)')).toBeInTheDocument();
    expect(screen.getByText('219')).toBeInTheDocument();
  });

  it("rend la pill statut (Brouillon pour draft)", () => {
    render(
      <LanguageStatusRow
        code="fr"
        label="FR"
        status="draft"
        scenesCount=""
        audioCount=""
        wordsCount={0}
      />,
    );
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
  });

  it("affiche le bouton action quand actionLabel + onActionClick fournis", () => {
    const onActionClick = jest.fn();
    render(
      <LanguageStatusRow
        code="de"
        label="DE"
        status="submitted"
        scenesCount=""
        audioCount=""
        wordsCount={0}
        actionLabel="Retirer"
        onActionClick={onActionClick}
      />,
    );
    fireEvent.click(screen.getByTestId('language-row-action'));
    expect(onActionClick).toHaveBeenCalledTimes(1);
  });

  it("masque le bouton action sans actionLabel", () => {
    render(
      <LanguageStatusRow
        code="fr"
        label="FR"
        status="draft"
        scenesCount=""
        audioCount=""
        wordsCount={0}
      />,
    );
    expect(screen.queryByTestId('language-row-action')).toBeNull();
  });
});
