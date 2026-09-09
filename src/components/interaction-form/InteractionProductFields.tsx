import React from 'react';
import { FieldErrors, Control, Controller } from 'react-hook-form';
import { InteractionFormInputs } from '../InteractionForm';
import { ClientRecord } from '../../types';
import { ProductSelector, ClassificationSelector, StatusSelector } from '../common';

interface InteractionProductFieldsProps {
  control: Control<InteractionFormInputs>;
  errors: FieldErrors<InteractionFormInputs>;
  products: string[];
  classifications: string[];
  matchedClient: ClientRecord | null;
  userManuallySelectedProductRef: React.MutableRefObject<boolean>;
  compact?: boolean;
}

export const InteractionProductFields: React.FC<InteractionProductFieldsProps> = ({
  control,
  errors,
  products,
  classifications,
  matchedClient,
  userManuallySelectedProductRef,
  compact = false,
}) => {
  return (
    <>
      {/* Product / Hardware Selection */}
      <Controller
        name="clientProduct"
        control={control}
        rules={{ required: 'Please select a Client Product' }}
        render={({ field }) => (
          <ProductSelector
            value={field.value}
            onChange={(val) => {
              userManuallySelectedProductRef.current = true;
              field.onChange(val);
            }}
            products={products}
            matchedClient={matchedClient as any}
            error={errors.clientProduct?.message}
          />
        )}
      />

      {/* Case Classification */}
      <Controller
        name="caseClassification"
        control={control}
        rules={{ required: 'Please select a Case Classification' }}
        render={({ field }) => (
          <ClassificationSelector
            value={field.value}
            onChange={(val) => field.onChange(val)}
            classifications={classifications}
            error={errors.caseClassification?.message}
          />
        )}
      />

      {/* Status */}
      <Controller
        name="status"
        control={control}
        rules={{ required: 'Please select a Status' }}
        render={({ field }) => (
          <StatusSelector
            value={field.value}
            onChange={(val) => field.onChange(val)}
            error={errors.status?.message}
            label={compact ? 'Status' : 'Interaction Status'}
          />
        )}
      />
    </>
  );
};
