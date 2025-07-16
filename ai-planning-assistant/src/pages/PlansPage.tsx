import React from 'react';
import { PlanCanvas } from '../components';

const CURRENT_USER_ID = 'demo-user';

const PlansPage: React.FC = () => {
  return <PlanCanvas userId={CURRENT_USER_ID} />;
};

export default PlansPage;