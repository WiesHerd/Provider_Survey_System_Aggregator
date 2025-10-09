/**
 * Weight Control Component
 * 
 * This component provides precision weight controls for specialty blending,
 * featuring a slider and input field with 2 decimal place precision.
 */

import React, { useState, useEffect } from 'react';
import Slider from 'react-slider';
import { SpecialtyItem } from '../types/blending';

interface WeightControlProps {
  specialty: SpecialtyItem;
  onChange: (weight: number) => void;
}

export const WeightControl: React.FC<WeightControlProps> = ({
  specialty,
  onChange
}) => {
  const [weight, setWeight] = useState(specialty.weight);
  const [inputValue, setInputValue] = useState(specialty.weight.toFixed(2));

  // Update local state when specialty weight changes
  useEffect(() => {
    setWeight(specialty.weight);
    setInputValue(specialty.weight.toFixed(2));
  }, [specialty.weight]);

  const handleSliderChange = (value: number) => {
    const newWeight = Math.round(value * 100) / 100; // 2 decimal places
    setWeight(newWeight);
    setInputValue(newWeight.toFixed(2));
    onChange(newWeight);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      const newWeight = Math.round(numValue * 100) / 100; // 2 decimal places
      setWeight(newWeight);
      onChange(newWeight);
    }
  };

  const handleInputBlur = () => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue) || numValue < 0) {
      setInputValue('0.00');
      setWeight(0);
      onChange(0);
    } else if (numValue > 100) {
      setInputValue('100.00');
      setWeight(100);
      onChange(100);
    } else {
      const newWeight = Math.round(numValue * 100) / 100;
      setInputValue(newWeight.toFixed(2));
      setWeight(newWeight);
      onChange(newWeight);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleInputBlur();
    }
  };

  return (
    <div className="space-y-3">
      {/* Slider */}
      <div className="px-2">
        <Slider
          value={weight}
          onChange={handleSliderChange}
          min={0}
          max={100}
          step={0.01} // 2 decimal places
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          thumbClassName="w-5 h-5 bg-blue-600 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          trackClassName="h-2 bg-gray-200 rounded-lg"
          renderThumb={(props, state) => (
            <div
              {...props}
              className="w-5 h-5 bg-blue-600 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              style={{
                ...props.style,
                transform: 'translate(-50%, -50%)',
              } as React.CSSProperties}
            >
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                {state.valueNow.toFixed(2)}%
              </div>
            </div>
          )}
        />
      </div>
      
      {/* Input Field */}
      <div className="flex items-center space-x-2">
        <label className="text-xs font-medium text-gray-700 min-w-0">
          Weight:
        </label>
        <div className="flex items-center space-x-1">
          <input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyPress={handleKeyPress}
            step="0.01"
            min="0"
            max="100"
            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.00"
          />
          <span className="text-xs text-gray-500">%</span>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="flex space-x-1">
        <button
          onClick={() => handleSliderChange(0)}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          0%
        </button>
        <button
          onClick={() => handleSliderChange(25)}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          25%
        </button>
        <button
          onClick={() => handleSliderChange(50)}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          50%
        </button>
        <button
          onClick={() => handleSliderChange(75)}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          75%
        </button>
        <button
          onClick={() => handleSliderChange(100)}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          100%
        </button>
      </div>
    </div>
  );
};
