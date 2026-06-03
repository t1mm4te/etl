import cn from 'classnames';
import css from './index.module.scss';

interface AlertProps {
  children: React.ReactNode;
  className?: string;
  color?: 'green';
}

export const Alert = ({ children, className, color }: AlertProps) => {
  return <div className={cn(css.alert, color === 'green' && css.green, className)}>{children}</div>;
};
