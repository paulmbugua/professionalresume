import React from 'react';
import { render } from '@testing-library/react-native';
// point at the actual filename:
import LoginPageNative from '../src/screens/LoginScreen.native';

describe('LoginPageNative', () => {
  it('renders the Login heading', () => {
    const { getByText } = render(<LoginPageNative />);
    expect(getByText(/Login to FunzaSasa/i)).toBeTruthy();
  });
});
