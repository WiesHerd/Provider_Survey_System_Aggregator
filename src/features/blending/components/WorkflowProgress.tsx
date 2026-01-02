/**
 * Workflow Progress Indicator Component
 * 
 * Shows step-by-step progress through the blending workflow
 */

import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface WorkflowStep {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
}

interface WorkflowProgressProps {
  currentStep: 'method' | 'filter' | 'select' | 'review';
  onStepClick?: (step: string) => void;
  isCompleted?: boolean;
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  currentStep,
  onStepClick,
  isCompleted = false
}) => {
  const steps: WorkflowStep[] = [
    {
      id: 'method',
      label: 'Choose Method',
      completed: currentStep !== 'method' || isCompleted,
      current: currentStep === 'method' && !isCompleted
    },
    {
      id: 'filter',
      label: 'Filter Data',
      completed: ['select', 'review'].includes(currentStep) || isCompleted,
      current: currentStep === 'filter' && !isCompleted
    },
    {
      id: 'select',
      label: 'Select Items',
      completed: currentStep === 'review' || isCompleted,
      current: currentStep === 'select' && !isCompleted
    },
    {
      id: 'review',
      label: 'Review & Create',
      completed: isCompleted,
      current: currentStep === 'review' && !isCompleted
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 px-6 py-4">
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const isClickable = onStepClick && (step.completed || step.current);
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={`flex flex-col items-center flex-1 min-w-0 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-lg p-2 ${
                    isClickable 
                      ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' 
                      : 'cursor-default'
                  }`}
                  aria-label={`${step.label} ${step.completed ? 'completed' : step.current ? 'current step' : 'pending'}`}
                >
                  <div className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors duration-200 ${
                    step.completed
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : step.current
                      ? 'bg-purple-50 border-purple-600 text-purple-600'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {step.completed ? (
                      <CheckCircleIcon className="w-6 h-6" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span className={`mt-2 text-sm font-medium text-center ${
                    step.current
                      ? 'text-purple-600'
                      : step.completed
                      ? 'text-gray-600'
                      : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </button>
                
                {/* Connector Line - thinner */}
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-2 transition-colors duration-200 ${
                    step.completed ? 'bg-purple-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

