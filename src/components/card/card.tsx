import React, { ReactNode } from 'react';
import styles from './card.module.css';

interface CardProps {
    children: ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
    return <div className={`${styles.card} ${className}`}>{children}</div>;
};

