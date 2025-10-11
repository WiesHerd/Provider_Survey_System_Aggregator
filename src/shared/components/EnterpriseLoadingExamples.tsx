import React, { useState } from 'react';
import { LoadingContainer, LoadingButton, LoadingForm, withLoading } from './LoadingContainer';

/**
 * ENTERPRISE LOADING PATTERNS - Google/Microsoft/OpenAI Examples
 * 
 * This file demonstrates how companies like Google, Microsoft, and OpenAI
 * implement reusable loading containers in their applications.
 */

// Example 1: Page-Level Loading (Google Search Results Pattern)
export const GoogleStylePageLoading: React.FC<{ loading: boolean }> = ({ loading }) => {
  return (
    <LoadingContainer
      loading={loading}
      variant="page"
      message="Loading search results..."
    >
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Search Results</h1>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">Result 1</div>
          <div className="p-4 border rounded-lg">Result 2</div>
          <div className="p-4 border rounded-lg">Result 3</div>
        </div>
      </div>
    </LoadingContainer>
  );
};

// Example 2: Component-Level Loading (Microsoft Office Pattern)
export const MicrosoftStyleComponentLoading: React.FC<{ loading: boolean }> = ({ loading }) => {
  return (
    <LoadingContainer
      loading={loading}
      variant="component"
      message="Processing document..."
    >
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Document Editor</h2>
        <div className="prose">
          <p>Your document content here...</p>
        </div>
      </div>
    </LoadingContainer>
  );
};

// Example 3: Button Loading (OpenAI API Pattern)
export const OpenAIButtonExample: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">OpenAI Style Button</h3>
      <LoadingButton
        loading={loading}
        onClick={handleSubmit}
        variant="primary"
        className="mr-4"
      >
        Generate Response
      </LoadingButton>
      
      <LoadingButton
        loading={loading}
        onClick={handleSubmit}
        variant="outline"
      >
        Save Draft
      </LoadingButton>
    </div>
  );
};

// Example 4: Form Loading (Google Forms Pattern)
export const GoogleFormExample: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 3000));
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Google Forms Style</h3>
      <LoadingForm
        loading={loading}
        onSubmit={handleSubmit}
        className="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your email"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Submit Form
          </button>
        </div>
      </LoadingForm>
    </div>
  );
};

// Example 5: Higher-Order Component (Microsoft Office Pattern)
const MyComponent: React.FC<{ data: string[] }> = ({ data }) => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">Data List</h3>
      <ul className="space-y-2">
        {data.map((item, index) => (
          <li key={index} className="p-2 bg-gray-100 rounded">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Wrap component with loading state
export const MyComponentWithLoading = withLoading(MyComponent, {
  variant: 'component',
  message: 'Loading data...'
});

// Example 6: Inline Loading (Google Search Suggestions)
export const GoogleInlineExample: React.FC<{ loading: boolean }> = ({ loading }) => {
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Google Search Suggestions</h3>
      <div className="relative">
        <input
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Search..."
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <LoadingContainer
              loading={true}
              variant="inline"
              message=""
            >
              <></>
            </LoadingContainer>
          </div>
        )}
      </div>
    </div>
  );
};

// Example 7: Overlay Loading (Microsoft Teams Pattern)
export const MicrosoftTeamsExample: React.FC<{ loading: boolean }> = ({ loading }) => {
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Microsoft Teams Style</h3>
      <div className="relative">
        <div className="p-4 bg-white border rounded-lg">
          <h4 className="font-semibold mb-2">Meeting Details</h4>
          <p className="text-gray-600">Meeting content here...</p>
        </div>
        
        <LoadingContainer
          loading={loading}
          variant="overlay"
          message="Joining meeting..."
        >
          <></>
        </LoadingContainer>
      </div>
    </div>
  );
};

/**
 * ENTERPRISE USAGE PATTERNS
 * 
 * 1. Page Loading: Use for route changes, data fetching
 * 2. Component Loading: Use for component updates, API calls
 * 3. Button Loading: Use for form submissions, actions
 * 4. Form Loading: Use for form processing
 * 5. Inline Loading: Use for search, autocomplete
 * 6. Overlay Loading: Use for critical operations
 * 7. HOC Pattern: Use for reusable components
 */
