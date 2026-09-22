import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input, Textarea, Select } from './Input';
import { describe, it, expect, vi } from 'vitest';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Input label="Username" />);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('passes additional props to input', () => {
    render(<Input data-testid="my-input" type="password" />);
    const input = screen.getByTestId('my-input');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('calls onChange when value changes', async () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'a');
    expect(onChange).toHaveBeenCalled();
  });
});

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea placeholder="Enter description" />);
    expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
  });

  it('renders label and error', () => {
    render(<Textarea label="Description" error="Too short" />);
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Too short')).toBeInTheDocument();
  });
});

describe('Select', () => {
  const options = [
    { value: 'fr', label: 'French' },
    { value: 'en', label: 'English' },
  ];

  it('renders select with options', () => {
    render(<Select options={options} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('French')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<Select label="Language" options={options} />);
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('renders error', () => {
    render(<Select options={options} error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});
