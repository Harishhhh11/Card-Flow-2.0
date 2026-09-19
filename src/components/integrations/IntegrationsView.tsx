import React from 'react';
import { GoogleSheetsView } from '../sheets/GoogleSheetsView';
import { Contact } from '../../types';

interface IntegrationsViewProps {
  contacts?: Contact[];
  contactsCount?: number;
  onGoBack?: () => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({ contacts = [], onGoBack }) => {
  return <GoogleSheetsView contacts={contacts} onGoBack={onGoBack} />;
};
