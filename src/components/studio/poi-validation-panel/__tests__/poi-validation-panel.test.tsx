import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PoiValidationPanel } from '../poi-validation-panel';

const baseProps = {
  sceneLabel: 'Scene 1',
  textExcerpt: 'Depuis la place, regardez la facade principale.',
  title: 'Place aux Aires',
  description: 'Ancien marche aux herbes',
  latitude: '43.6591',
  longitude: '6.9243',
  addressSearch: '',
  searchResult: null,
  isSearching: false,
  isSaved: false,
  isLocked: false,
  onTitleChange: jest.fn(),
  onDescriptionChange: jest.fn(),
  onLatitudeChange: jest.fn(),
  onLongitudeChange: jest.fn(),
  onAddressSearchChange: jest.fn(),
  onAddressSearch: jest.fn(),
  onSave: jest.fn(),
};

describe('PoiValidationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a localized status when coordinates are valid', () => {
    render(<PoiValidationPanel {...baseProps} />);
    expect(screen.getByTestId('poi-validation-status')).toHaveTextContent('Lieu localise');
    expect(screen.getByTestId('poi-map-preview')).toBeInTheDocument();
  });

  it('shows a verification status without coordinates', () => {
    render(<PoiValidationPanel {...baseProps} latitude="" longitude="" />);
    expect(screen.getByTestId('poi-validation-status')).toHaveTextContent('A verifier');
    expect(screen.queryByTestId('poi-map-preview')).not.toBeInTheDocument();
  });

  it('calls search on Enter from the address field', () => {
    render(<PoiValidationPanel {...baseProps} />);
    fireEvent.keyDown(screen.getByTestId('poi-address-search'), { key: 'Enter' });
    expect(baseProps.onAddressSearch).toHaveBeenCalled();
  });

  it('calls save when validating the place', () => {
    render(<PoiValidationPanel {...baseProps} />);
    fireEvent.click(screen.getByTestId('save-poi-btn'));
    expect(baseProps.onSave).toHaveBeenCalled();
  });
});

