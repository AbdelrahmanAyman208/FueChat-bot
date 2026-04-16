import { HTMLAttributes } from 'react';
import clsx from 'clsx';

const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return <div className={clsx('card-surface', className)} {...props} />;
};

export default Card;
