import cn from 'classnames';
import { Link } from 'react-router-dom';
import css from './index.module.scss';

export type ButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  color?: 'green' | 'white';
  type?: 'button' | 'submit';
  onClick?: () => void;
};

export const Button = ({
  children,
  disabled = false,
  color = 'green',
  type = 'submit',
  onClick,
}: ButtonProps) => {
  return (
    <button
      className={cn(css.button, disabled && css.disabled, css[color])}
      type={type}
      disabled={disabled}
      onClick={onClick}
    >
      <span className={css.text}>{children}</span>
    </button>
  );
};

export const LinkButton = ({
  children,
  to,
  color = 'green',
}: {
  children: React.ReactNode;
  to: string;
  color?: 'white' | 'green';
}) => {
  return (
    <Link className={cn(css.button, css[color])} to={to}>
      {children}
    </Link>
  );
};
