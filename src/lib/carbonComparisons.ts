import { Coffee, Car, Beef } from 'lucide-react';

// CO2 equivalents in kg
const CO2_EQUIVALENTS = {
  starbucksLatte: 0.55, // kg CO2 per grande latte
  milesDriven: 0.4,      // kg CO2 per mile driven
  cheeseburger: 3.5,     // kg CO2 per cheeseburger
};

export interface CarbonComparison {
  icon: typeof Coffee | typeof Car | typeof Beef;
  value: number;
  unit: string;
  label: string;
}

export function getCarbonComparisons(co2Kg: number): CarbonComparison[] {
  const absAmount = Math.abs(co2Kg);
  
  return [
    {
      icon: Coffee,
      value: absAmount / CO2_EQUIVALENTS.starbucksLatte,
      unit: 'lattes',
      label: 'Starbucks lattes',
    },
    {
      icon: Car,
      value: absAmount / CO2_EQUIVALENTS.milesDriven,
      unit: 'miles',
      label: 'miles driven',
    },
    {
      icon: Beef,
      value: absAmount / CO2_EQUIVALENTS.cheeseburger,
      unit: 'burgers',
      label: 'cheeseburgers',
    },
  ];
}

export function formatComparisonValue(value: number): string {
  if (value < 0.1) return value.toFixed(2);
  if (value < 1) return value.toFixed(1);
  if (value < 10) return value.toFixed(1);
  return Math.round(value).toString();
}
