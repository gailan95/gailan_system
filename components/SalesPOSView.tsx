import React from 'react';
import { Sale } from '../types';
import { EmployeeDataEntryForm } from './EmployeeDataEntryForm';

interface SalesPOSViewProps {
  onSaleComplete?: (sale: Sale) => void;
  onGoToDebts?: () => void;
}

export const SalesPOSView: React.FC<SalesPOSViewProps> = ({
  onGoToDebts,
}) => {
  return (
    <div className="space-y-6">
      <EmployeeDataEntryForm onGoToDebts={onGoToDebts} />
    </div>
  );
};
