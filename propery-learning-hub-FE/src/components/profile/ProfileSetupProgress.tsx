// components/profile/ProfileSetupProgress.tsx
'use client';

interface ProfileSetupProgressProps {
  currentStep: number;
  userType?: 'learner' | 'instructor';
}

const learnerSteps = [
  { number: 1, title: 'Personal Info', description: 'Basic information' },
  { number: 2, title: 'Professional Profile', description: 'Interests & goals' },
];

const instructorSteps = [
  { number: 1, title: 'Profile', description: 'Expertise & bio' },
  { number: 2, title: 'Teaching Profile', description: 'Qualifications' },
  { number: 3, title: 'Instructor Plan', description: 'Choose your plan' },
];

const ProfileSetupProgress = ({ currentStep, userType = 'learner' }: ProfileSetupProgressProps) => {
  const steps = userType === 'instructor' ? instructorSteps : learnerSteps;
  const isComplete = currentStep > steps.length;

  return (
    <div className="mb-12">
      <div className="relative">
        {/* Progress line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200">
          <div 
            className="h-full bg-blue-900 transition-all duration-500"
            style={{ 
              width: isComplete 
                ? '100%' 
                : `${((currentStep - 1) / (steps.length - 1)) * 100}%` 
            }}
          />
        </div>

        {/* Steps */}
        <div className="flex justify-between">
          {steps.map((step) => {
            const isActive = step.number === currentStep;
            const isCompleted = step.number < currentStep || isComplete;
            
            return (
              <div key={step.number} className="relative flex flex-col items-center">
                {/* Step circle */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${
                  isActive
                    ? 'bg-blue-900 text-white scale-110 shadow-lg shadow-blue-900/30 ring-4 ring-blue-900/20'
                    : isCompleted
                    ? 'bg-blue-900 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-sm font-bold">{step.number}</span>
                  )}
                </div>

                {/* Step labels */}
                <div className="text-center">
                  <div className={`text-sm font-semibold ${
                    isActive ? 'text-blue-900' : 
                    isCompleted ? 'text-blue-900' : 
                    'text-gray-400'
                  }`}>
                    {step.title}
                  </div>
                  <div className={`text-xs mt-1 ${
                    isActive ? 'text-blue-900' : 
                    isCompleted ? 'text-blue-700' : 
                    'text-gray-500'
                  }`}>
                    {step.description}
                  </div>
                </div>

                {/* Step number indicator */}
                {isActive && (
                  <div className="absolute -bottom-6 text-xs font-semibold text-blue-900">
                    Step {step.number} of {steps.length}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Completion indicator */}
        {isComplete && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-sm font-semibold text-green-600">
            Profile Complete! 🎉
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSetupProgress;