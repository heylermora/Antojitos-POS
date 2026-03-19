import { render, screen } from '@testing-library/react';
import App from './App';

const mockUnsubscribe = jest.fn();

jest.mock('./services/authService', () => ({
  isAuthenticated: () => false,
  subscribeAuth: () => mockUnsubscribe,
  logout: jest.fn(),
}));

test('renders login screen', () => {
  render(<App />);
  expect(screen.getByText(/Antojitos del Alma/i)).toBeInTheDocument();
  expect(screen.getByText(/Inicio de sesión para empleados/i)).toBeInTheDocument();
});
