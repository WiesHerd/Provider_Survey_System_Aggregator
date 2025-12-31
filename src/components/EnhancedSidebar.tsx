import React, { useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useProviderContext } from '../contexts/ProviderContext';
import { UIProviderType } from '../types/provider';
import { ProviderTypeSelector } from '../shared/components/ProviderTypeSelector';
import { UserMenu } from './UserMenu';
import { queryKeys } from '../shared/services/queryClient';
import {
	HomeIcon,
	ChartBarIcon,
	ArrowUpTrayIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	PresentationChartLineIcon,
	MapIcon,
	CalculatorIcon,
	DocumentChartBarIcon,
	DocumentTextIcon,
	UserIcon,
	CurrencyDollarIcon,
	ArrowsPointingOutIcon,
	PlusIcon,
	AcademicCapIcon,
} from '@heroicons/react/24/outline';


interface SidebarProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
}

interface MenuItem {
	name: string;
	icon: React.ComponentType<any>;
	path: string;
	children?: MenuItem[];
}

interface MenuGroup {
	name: string;
	items: MenuItem[];
}

const EnhancedSidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
	const navigate = useNavigate();
	const location = useLocation();
	const currentPath = location.pathname;
	const listRef = useRef<HTMLDivElement>(null);
	const { selectedProviderType, setProviderType } = useProviderContext();
	const queryClient = useQueryClient();
	const [logoError, setLogoError] = useState(false);
	const [collapsedLogoError, setCollapsedLogoError] = useState(false);
	
	// Define all menu groups with ChatGPT-style organization
	const allMenuGroups: MenuGroup[] = [
		{
			name: 'Surveys',
			items: [
				{ name: 'Add / View', icon: PlusIcon, path: '/upload' },
			]
		},
		{
			name: 'Data Management',
			items: [
				{ name: 'Specialties', icon: AcademicCapIcon, path: '/specialty-mapping' },
				{ name: 'Provider Types', icon: UserIcon, path: '/provider-type-mapping' },
				{ name: 'Regions', icon: MapIcon, path: '/region-mapping' },
				{ name: 'Comp Metrics', icon: CurrencyDollarIcon, path: '/variable-mapping' },
			]
		},
			{
				name: 'Analysis Tools',
				items: [
					{ name: 'Benchmarking', icon: PresentationChartLineIcon, path: '/benchmarking' },
					{ name: 'Regional Data', icon: MapIcon, path: '/regional-analytics' },
					{ name: 'Custom Blending', icon: ArrowsPointingOutIcon, path: '/specialty-blending' },
					{ name: 'Chart & Report Builder', icon: DocumentChartBarIcon, path: '/custom-reports' },
					{ name: 'Report Library', icon: DocumentTextIcon, path: '/canned-reports' },
					{ name: 'Fair Market Value', icon: CalculatorIcon, path: '/fair-market-value' },
				]
			}
	];


	// Use all menu groups - no filtering needed
	const menuGroups = allMenuGroups;


	const handleNavigation = (path: string) => navigate(path);

	// ENTERPRISE: Aggressive prefetching on hover for instant navigation
	const handleMouseEnter = useCallback((path: string) => {
		const providerType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
		const providerTypeKey = providerType || 'all';
		
		// Prefetch mapping data with 24h cache
		if (path === '/specialty-mapping') {
			queryClient.prefetchQuery({
				queryKey: [...queryKeys.mappings.specialty(), providerTypeKey],
				queryFn: async () => {
					const { DataService } = await import('../services/DataService');
					const dataService = new DataService();
					const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
						dataService.getAllSpecialtyMappings(providerType),
						dataService.getUnmappedSpecialties(providerType),
						dataService.getLearnedMappings('specialty', providerType),
						dataService.getLearnedMappingsWithSource('specialty', providerType)
					]);
					return { mappings, unmapped, learned, learnedWithSource };
				},
				staleTime: 1000 * 60 * 60 * 24, // 24 hours
			}).catch(() => {});
		} else if (path === '/variable-mapping') {
			queryClient.prefetchQuery({
				queryKey: [...queryKeys.mappings.variable(), providerTypeKey],
				queryFn: async () => {
					const { DataService } = await import('../services/DataService');
					const dataService = new DataService();
					const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
						dataService.getVariableMappings(providerType),
						dataService.getUnmappedVariables(providerType),
						dataService.getLearnedMappings('variable', providerType),
						dataService.getLearnedMappingsWithSource('variable', providerType)
					]);
					return { mappings, unmapped, learned, learnedWithSource };
				},
				staleTime: 1000 * 60 * 60 * 24, // 24 hours
			}).catch(() => {});
		} else if (path === '/region-mapping') {
			queryClient.prefetchQuery({
				queryKey: [...queryKeys.mappings.region(), providerTypeKey],
				queryFn: async () => {
					const { DataService } = await import('../services/DataService');
					const dataService = new DataService();
					const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
						dataService.getRegionMappings(providerType),
						dataService.getUnmappedRegions(providerType),
						dataService.getLearnedMappings('region', providerType),
						dataService.getLearnedMappingsWithSource('region', providerType)
					]);
					return { mappings, unmapped, learned, learnedWithSource };
				},
				staleTime: 1000 * 60 * 60 * 24, // 24 hours
			}).catch(() => {});
		} else if (path === '/provider-type-mapping') {
			queryClient.prefetchQuery({
				queryKey: [...queryKeys.mappings.providerType(), providerTypeKey],
				queryFn: async () => {
					const { DataService } = await import('../services/DataService');
					const dataService = new DataService();
					const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
						dataService.getProviderTypeMappings(providerType),
						dataService.getUnmappedProviderTypes(providerType),
						dataService.getLearnedMappings('providerType', providerType),
						dataService.getLearnedMappingsWithSource('providerType', providerType)
					]);
					return { mappings, unmapped, learned, learnedWithSource };
				},
				staleTime: 1000 * 60 * 60 * 24, // 24 hours
			}).catch(() => {});
		} else if (path === '/benchmarking' || path === '/regional-analytics') {
			// Prefetch benchmarking data (shared by both routes)
			queryClient.prefetchQuery({
				queryKey: queryKeys.benchmarking({
					specialty: '',
					surveySource: '',
					region: '',
					providerType: '',
					year: ''
				}),
				queryFn: async () => {
					const { fetchBenchmarkingData } = await import('../features/analytics/hooks/useBenchmarkingQuery') as { fetchBenchmarkingData: (filters: { specialty: string; surveySource: string; geographicRegion: string; providerType: string; year: string }) => Promise<any> };
					return fetchBenchmarkingData({
						specialty: '',
						surveySource: '',
						geographicRegion: '',
						providerType: '',
						year: ''
					});
				},
				staleTime: 1000 * 60 * 60, // 1 hour
			}).catch(() => {});
		} else if (path === '/custom-reports' || path === '/canned-reports') {
			// Prefetch reports data
			queryClient.prefetchQuery({
				queryKey: queryKeys.reports('default'),
				queryFn: async () => {
					const { getDataService } = await import('../services/DataService');
					const dataService = getDataService();
					return dataService.getAllSurveys();
				},
				staleTime: 1000 * 60 * 60, // 1 hour
			}).catch(() => {});
		} else if (path === '/fair-market-value') {
			// Prefetch FMV data
			queryClient.prefetchQuery({
				queryKey: queryKeys.fmv({
					specialty: '',
					providerType: '',
					region: '',
					year: '',
					aggregationMethod: ''
				}),
				queryFn: async () => {
					const { AnalyticsDataService } = await import('../features/analytics/services/analyticsDataService');
					const service = new AnalyticsDataService();
					return service.getAnalyticsData({
						specialty: '',
						surveySource: '',
						geographicRegion: '',
						providerType: '',
						year: ''
					});
				},
				staleTime: 1000 * 60 * 60, // 1 hour
			}).catch(() => {});
		} else if (path === '/specialty-blending') {
			// Prefetch blending data
			queryClient.prefetchQuery({
				queryKey: queryKeys.blending('default', '1.0', 'default'),
				queryFn: async () => {
					const { getDataService } = await import('../services/DataService');
					const dataService = getDataService();
					return dataService.getAllSurveys();
				},
				staleTime: 1000 * 60 * 60, // 1 hour
			}).catch(() => {});
		}
	}, [queryClient, selectedProviderType]);

	// Check if current path is in Analytics & Reports section
	const isAnalyticsRoute = (path: string) => {
		const analyticsRoutes = [
			'/benchmarking', 
			'/regional-analytics',
			'/specialty-blending',
			'/custom-reports',
			'/canned-reports',
			'/fair-market-value'
		];
		return analyticsRoutes.includes(path);
	};

	// Keyboard navigation: Arrow/Home/End over visible items
	const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
		const items = Array.from((listRef.current?.querySelectorAll('a[href]') || []) as NodeListOf<HTMLElement>);
		const currentIndex = items.findIndex((el) => el === document.activeElement);
		if (items.length === 0) return;
		let nextIndex = currentIndex;
		switch (e.key) {
			case 'ArrowDown':
				nextIndex = (currentIndex + 1 + items.length) % items.length; break;
			case 'ArrowUp':
				nextIndex = (currentIndex - 1 + items.length) % items.length; break;
			case 'Home':
				nextIndex = 0; break;
			case 'End':
				nextIndex = items.length - 1; break;
			case 'Escape':
				setIsOpen(false); return;
			default:
				return;
		}
		e.preventDefault();
		items[nextIndex]?.focus();
	};

	const renderMenuItem = (item: MenuItem) => {
		const isActive = currentPath === item.path;

		return (
			<NavLink
				key={item.name}
				to={item.path}
				aria-current={isActive ? 'page' : undefined}
				onMouseEnter={() => handleMouseEnter(item.path)}
				className={({ isActive }) => `
					w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group
					${!isOpen ? 'justify-center' : ''}
					${isActive 
						? 'bg-gray-100 text-gray-900 font-medium' 
						: 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
					}
				`}
			>
				<item.icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-200
					${isActive ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}
				`} />
				{isOpen && (
					<span className="ml-3 text-sm truncate">
						{item.name}
					</span>
				)}
				{!isOpen && (
					<div className="absolute left-16 px-3 py-2 ml-2 text-sm font-medium text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
						{item.name}
					</div>
				)}
			</NavLink>
		);
	};

	const renderMenuGroup = (group: MenuGroup) => {
		if (group.items.length === 0) return null;

		return (
			<div key={group.name} className="mb-8">
				{isOpen && (
					<h3 className="px-3 mb-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
						{group.name}
					</h3>
				)}
				<div className="space-y-0.5">
					{group.items.map(renderMenuItem)}
				</div>
			</div>
		);
	};

	return (
		<div className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
			isOpen ? 'w-64' : 'w-16'
		}`}>
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3">
				{isOpen && (
					<button 
						onClick={() => handleNavigation('/dashboard')}
						className="flex items-center hover:bg-gray-50 rounded-lg p-2 transition-colors duration-200"
						aria-label="Go to Dashboard"
					>
						<div className="w-12 h-12 flex items-center justify-center">
							{!logoError ? (
								<img 
									src={process.env.PUBLIC_URL + '/benchpoint-icon.svg?v=7'} 
									alt="BenchPoint - Survey Aggregator" 
									className="w-12 h-12 object-contain" 
									onError={() => setLogoError(true)}
								/>
							) : (
								<svg className="w-12 h-12" fill="currentColor" viewBox="0 0 64 64">
									<defs>
										<linearGradient id="benchpointGradient" x1="0%" y1="0%" x2="100%" y2="100%">
											<stop offset="0%" style={{ stopColor: '#4F46E5', stopOpacity: 1 }} />
											<stop offset="100%" style={{ stopColor: '#7C3AED', stopOpacity: 1 }} />
										</linearGradient>
									</defs>
									<circle cx="32" cy="32" r="28" fill="url(#benchpointGradient)" stroke="#E5E7EB" strokeWidth="2"/>
									<circle cx="20" cy="24" r="3" fill="white" opacity="0.9"/>
									<circle cx="32" cy="18" r="3" fill="white" opacity="0.9"/>
									<circle cx="44" cy="24" r="3" fill="white" opacity="0.9"/>
									<circle cx="20" cy="40" r="3" fill="white" opacity="0.9"/>
									<circle cx="32" cy="46" r="3" fill="white" opacity="0.9"/>
									<circle cx="44" cy="40" r="3" fill="white" opacity="0.9"/>
									<line x1="20" y1="24" x2="32" y2="18" stroke="white" strokeWidth="2" opacity="0.7"/>
									<line x1="32" y1="18" x2="44" y2="24" stroke="white" strokeWidth="2" opacity="0.7"/>
									<line x1="20" y1="40" x2="32" y2="46" stroke="white" strokeWidth="2" opacity="0.7"/>
									<line x1="32" y1="46" x2="44" y2="40" stroke="white" strokeWidth="2" opacity="0.7"/>
									<line x1="20" y1="24" x2="20" y2="40" stroke="white" strokeWidth="2" opacity="0.7"/>
									<line x1="44" y1="24" x2="44" y2="40" stroke="white" strokeWidth="2" opacity="0.7"/>
									<circle cx="32" cy="32" r="4" fill="white"/>
									<circle cx="32" cy="32" r="2" fill="#4F46E5"/>
								</svg>
							)}
						</div>
						<span className="ml-3 text-lg font-semibold flex items-center">
							<span className="text-indigo-600">Bench</span>
							<span className="text-purple-600">Point</span>
						</span>
					</button>
				)}
				{!isOpen && (
					<button 
						onClick={() => handleNavigation('/dashboard')}
						className="w-12 h-12 flex items-center justify-center mx-auto hover:bg-gray-50 rounded-lg transition-colors duration-200"
						aria-label="Go to Dashboard"
					>
						{!collapsedLogoError ? (
							<img 
								src={process.env.PUBLIC_URL + '/benchpoint-icon.svg?v=7'} 
								alt="BenchPoint - Survey Aggregator" 
								className="w-12 h-12 object-contain" 
								onError={() => setCollapsedLogoError(true)}
							/>
						) : (
							<svg className="w-12 h-12" fill="currentColor" viewBox="0 0 64 64">
								<defs>
									<linearGradient id="benchpointGradientCollapsed" x1="0%" y1="0%" x2="100%" y2="100%">
										<stop offset="0%" style={{ stopColor: '#4F46E5', stopOpacity: 1 }} />
										<stop offset="100%" style={{ stopColor: '#7C3AED', stopOpacity: 1 }} />
									</linearGradient>
								</defs>
								<circle cx="32" cy="32" r="28" fill="url(#benchpointGradientCollapsed)" stroke="#E5E7EB" strokeWidth="2"/>
								<circle cx="20" cy="24" r="3" fill="white" opacity="0.9"/>
								<circle cx="32" cy="18" r="3" fill="white" opacity="0.9"/>
								<circle cx="44" cy="24" r="3" fill="white" opacity="0.9"/>
								<circle cx="20" cy="40" r="3" fill="white" opacity="0.9"/>
								<circle cx="32" cy="46" r="3" fill="white" opacity="0.9"/>
								<circle cx="44" cy="40" r="3" fill="white" opacity="0.9"/>
								<line x1="20" y1="24" x2="32" y2="18" stroke="white" strokeWidth="2" opacity="0.7"/>
								<line x1="32" y1="18" x2="44" y2="24" stroke="white" strokeWidth="2" opacity="0.7"/>
								<line x1="20" y1="40" x2="32" y2="46" stroke="white" strokeWidth="2" opacity="0.7"/>
								<line x1="32" y1="46" x2="44" y2="40" stroke="white" strokeWidth="2" opacity="0.7"/>
								<line x1="20" y1="24" x2="20" y2="40" stroke="white" strokeWidth="2" opacity="0.7"/>
								<line x1="44" y1="24" x2="44" y2="40" stroke="white" strokeWidth="2" opacity="0.7"/>
								<circle cx="32" cy="32" r="4" fill="white"/>
								<circle cx="32" cy="32" r="2" fill="#4F46E5"/>
							</svg>
						)}
					</button>
				)}
				<button
					onClick={() => setIsOpen(!isOpen)}
					className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
					aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
				>
					{isOpen ? (
						<ChevronLeftIcon className="w-5 h-5" />
					) : (
						<ChevronRightIcon className="w-5 h-5" />
					)}
				</button>
			</div>


			{/* Provider Type Selector - Hidden in Analytics & Reports sections */}
			{isOpen && !isAnalyticsRoute(currentPath) && (
				<div className="px-3 py-2 border-b border-gray-100">
					<div className="mb-1">
						<h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
							Data View
						</h3>
					</div>
					<ProviderTypeSelector
						value={selectedProviderType}
						onChange={(value) => setProviderType(value, 'sidebar')}
						context="navigation"
						className="w-full"
						showBothOption={false}
					/>
				</div>
			)}

			{/* Main Menu */}
			<nav aria-label="Primary" className="flex-1 px-3 py-6 overflow-y-auto">
				<div ref={listRef} onKeyDown={handleKeyDown}>
					{/* Main Menu Groups */}
					{menuGroups.map(renderMenuGroup)}
				</div>
			</nav>

			{/* User Profile Section - Professional User Menu */}
			<UserMenu isSidebarOpen={isOpen} />

		</div>
	);
};

export default EnhancedSidebar;
