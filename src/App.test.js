import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

const mockUnsubscribe = jest.fn();

jest.mock('./services/worklogService', () => ({
  getEmployees: jest.fn().mockResolvedValue([]),
}));

jest.mock('./services/authService', () => ({
  isAuthenticated: () => false,
  subscribeAuth: () => mockUnsubscribe,
  logout: jest.fn(),
  getCurrentRole: () => 'collaborator',
  getCurrentOperatorName: () => '',
}));

test('renders login screen', async () => {
  render(<App />);
  expect(screen.getByText(/Antojitos del Alma/i)).toBeInTheDocument();
  expect(screen.getByText(/Inicio de sesión para empleados/i)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument());
});
