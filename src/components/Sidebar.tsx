import React, { useRef, useState, useEffect } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { IndexedDBService } from '../services/IndexedDBService';
import { useProviderContext } from '../contexts/ProviderContext';
import { useYear } from '../contexts/YearContext';
import {
	HomeIcon,
	ChartBarIcon,
	ArrowUpTrayIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	TableCellsIcon,
	PresentationChartLineIcon,
	MapIcon,
	CalculatorIcon,
	InformationCircleIcon,
	DocumentChartBarIcon,
	UserIcon,
	CurrencyDollarIcon,
	CircleStackIcon,
} from '@heroicons/react/24/outline';

// Medical cross icon to represent medical specialties
const MedicalCrossIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth={1.5}
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4z" />
	</svg>
);

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

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
	const location = useLocation();
	const currentPath = location.pathname;
	const listRef = useRef<HTMLDivElement>(null);
	
	// Use global provider context instead of local state
	const { selectedProviderType, setProviderType, availableProviderTypes } = useProviderContext();
	const { currentYear, setCurrentYear, availableYears } = useYear();
	const [localAvailableProviderTypes, setLocalAvailableProviderTypes] = useState<Set<string>>(new Set(['PHYSICIAN']));
	
	// Detect what provider types are actually loaded
	useEffect(() => {
		const detectLoadedProviderTypes = async () => {
			try {
				const indexedDB = new IndexedDBService();
				const surveys = await indexedDB.getAllSurveys();
				
				const providerTypes = new Set<string>();
				surveys.forEach(survey => {
					const providerType = (survey as any).providerType;
					if (providerType) {
						providerTypes.add(providerType);
					} else {
						// If no provider type is set, assume it's physician data (legacy)
						providerTypes.add('PHYSICIAN');
					}
				});
				
				// Always include PHYSICIAN as default
				providerTypes.add('PHYSICIAN');
				
				setLocalAvailableProviderTypes(providerTypes);
				
				// If current selection is not available, default to first available
				if (!providerTypes.has(selectedProviderType) && providerTypes.size > 0) {
					const firstType = Array.from(providerTypes)[0] as 'PHYSICIAN' | 'APP';
					setProviderType(firstType, 'sidebar-auto-detection');
				}
			} catch (error) {
				console.error('Error detecting provider types:', error);
				// Fallback to just PHYSICIAN
				setLocalAvailableProviderTypes(new Set(['PHYSICIAN']));
			}
		};
		
		detectLoadedProviderTypes();
	}, [selectedProviderType]);
	
	const menuGroups: MenuGroup[] = [
		{
			name: 'Getting Started',
			items: [
				{ name: 'Home', icon: HomeIcon, path: '/dashboard' },
				{ name: 'Upload Data', icon: ArrowUpTrayIcon, path: '/upload' },
			]
		},
		{
			name: 'Data Mapping',
			items: [
				{ name: 'Specialties', icon: MedicalCrossIcon, path: '/specialty-mapping' },
				{ name: 'Provider Types', icon: UserIcon, path: '/provider-type-mapping' },
				{ name: 'Regions', icon: MapIcon, path: '/region-mapping' },
				{ name: 'Comp Metrics', icon: CurrencyDollarIcon, path: '/variable-mapping' },
				{ name: 'Other Column Mappings', icon: TableCellsIcon, path: '/column-mapping' },
			]
		},
		{
			name: 'Analytics & Reports',
			items: [
				{ name: 'Normalized Data', icon: CircleStackIcon, path: '/normalized-data' },
				{ name: 'Survey Analytics', icon: PresentationChartLineIcon, path: '/analytics' },
				{ name: 'Regional Analytics', icon: ChartBarIcon, path: '/regional-analytics' },
				{ name: 'Custom Reports', icon: DocumentChartBarIcon, path: '/custom-reports' },
				{ name: 'Fair Market Value', icon: CalculatorIcon, path: '/fair-market-value' },
			]
		}
	];


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
				className={({ isActive }) => `
					w-full flex items-center px-3 py-2 rounded-md transition-all duration-200 group
					${!isOpen ? 'justify-center' : ''}
					${isActive 
						? 'bg-indigo-50 text-indigo-600 border-r-2 border-indigo-600' 
						: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
					}
				`}
			>
				<item.icon className={`w-4 h-4 flex-shrink-0 transition-colors duration-200
					${isActive ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-700'}
				`} />
				{isOpen && (
					<span className="ml-3 font-medium text-sm truncate">
						{item.name}
					</span>
				)}
				{!isOpen && (
					<div className="absolute left-16 px-2 py-1 ml-2 text-sm font-medium text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
						{item.name}
					</div>
				)}
			</NavLink>
		);
	};

	const renderMenuGroup = (group: MenuGroup, index: number) => {
		return (
			<div key={group.name} className="mb-6">
				{/* Group Header - only show when expanded */}
				{isOpen && (
					<div className="px-3 mb-3">
						<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
							{group.name}
						</h3>
					</div>
				)}
				
				{/* Group Items */}
				<div className="space-y-1">
					{group.items.map(item => renderMenuItem(item))}
				</div>
				
				{/* Divider between groups - only show when expanded and not last group */}
				{isOpen && index < menuGroups.length - 1 && (
					<div className="border-t border-gray-200 mt-6"></div>
				)}
			</div>
		);
	};

	return (
		<div
			className={`fixed left-0 top-0 h-screen bg-white transition-all duration-300 ease-in-out z-40
				${isOpen ? 'w-64' : 'w-20'} flex flex-col border-r border-gray-100`}
		>
			{/* Branding */}
			<div className="flex items-center justify-between h-16 px-4">
				<div className="flex items-center">
					<div className="w-12 h-12 flex items-center justify-center">
								 <img 
										   src={process.env.PUBLIC_URL + '/benchpoint-icon.svg?v=7'} 
								   alt="BenchPoint - Survey Aggregator" 
								   className="w-12 h-12 object-contain" 
								  onError={(e) => {
									const target = e.target as HTMLImageElement;
									console.log('Image failed to load:', target.src);
									// Show fallback icon if image fails
									target.style.display = 'none';
									const parent = target.parentElement;
									if (parent) {
										parent.innerHTML = `
											<svg class="w-12 h-12" fill="currentColor" viewBox="0 0 64 64">
												<defs>
													<linearGradient id="benchpointGradient" x1="0%" y1="0%" x2="100%" y2="100%">
														<stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
														<stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
													</linearGradient>
												</defs>
												<circle cx="32" cy="32" r="28" fill="url(#benchpointGradient)" stroke="#E5E7EB" stroke-width="2"/>
												<circle cx="20" cy="24" r="3" fill="white" opacity="0.9"/>
												<circle cx="32" cy="18" r="3" fill="white" opacity="0.9"/>
												<circle cx="44" cy="24" r="3" fill="white" opacity="0.9"/>
												<circle cx="20" cy="40" r="3" fill="white" opacity="0.9"/>
												<circle cx="32" cy="46" r="3" fill="white" opacity="0.9"/>
												<circle cx="44" cy="40" r="3" fill="white" opacity="0.9"/>
												<line x1="20" y1="24" x2="32" y2="18" stroke="white" stroke-width="2" opacity="0.7"/>
												<line x1="32" y1="18" x2="44" y2="24" stroke="white" stroke-width="2" opacity="0.7"/>
												<line x1="20" y1="40" x2="32" y2="46" stroke="white" stroke-width="2" opacity="0.7"/>
												<line x1="32" y1="46" x2="44" y2="40" stroke="white" stroke-width="2" opacity="0.7"/>
												<line x1="20" y1="24" x2="20" y2="40" stroke="white" stroke-width="2" opacity="0.7"/>
												<line x1="44" y1="24" x2="44" y2="40" stroke="white" stroke-width="2" opacity="0.7"/>
												<circle cx="32" cy="32" r="4" fill="white"/>
												<circle cx="32" cy="32" r="2" fill="#4F46E5"/>
											</svg>
										`;
									}
								}} 
							/>
					</div>
					{isOpen && (
						<span className="ml-3 font-bold text-xl flex items-center" style={{ letterSpacing: 0.5 }}>
							<span className="text-indigo-600">Bench</span>
							<span className="text-purple-600">Point</span>
						</span>
					)}
				</div>
				
				{/* Toggle Button - Google-style positioning */}
				<button
					onClick={() => setIsOpen(!isOpen)}
					className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
					aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
				>
					{isOpen ? (
						<ChevronLeftIcon className="w-4 h-4 text-gray-600 hover:text-indigo-600" />
					) : (
						<ChevronRightIcon className="w-4 h-4 text-gray-600 hover:text-indigo-600" />
					)}
				</button>
			</div>

			{/* Data View Selector */}
			{isOpen && (
				<div className="px-3 py-4 border-b border-gray-100">
					<div className="mb-2">
						<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
							Data View
						</h3>
					</div>
					<select
						value={selectedProviderType}
						onChange={(e) => setProviderType(e.target.value as 'PHYSICIAN' | 'APP', 'sidebar-dropdown')}
						className="w-full px-3 py-2 text-sm bg-white border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 transition-colors"
						aria-label="Select data view type"
					>
						{localAvailableProviderTypes.has('PHYSICIAN') && (
							<option value="PHYSICIAN">Physicians</option>
						)}
						{localAvailableProviderTypes.has('APP') && (
							<option value="APP">APP's</option>
						)}
					</select>
				</div>
			)}

			{/* Year Selector */}
			{isOpen && (
				<div className="px-3 py-4 border-b border-gray-100">
					<div className="mb-2">
						<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
							Year
						</h3>
					</div>
					<select
						value={currentYear}
						onChange={(e) => setCurrentYear(e.target.value)}
						className="w-full px-3 py-2 text-sm bg-white border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 transition-colors"
						aria-label="Select year"
					>
						{availableYears.map((year) => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
				</div>
			)}

			{/* Main Menu */}
			<nav aria-label="Primary" className="flex-1 px-3 py-6 overflow-y-auto">
				<div ref={listRef} onKeyDown={handleKeyDown}>
					{menuGroups.map((group, index) => renderMenuGroup(group, index))}
				</div>
			</nav>

			{/* Provider Type Indicator */}
			{isOpen && (
				<div className="px-3 py-2 border-t border-gray-100">
					<div className="flex items-center text-xs text-gray-500">
						<InformationCircleIcon className="w-4 h-4 mr-2" />
						<span>View: {selectedProviderType === 'PHYSICIAN' ? 'Physicians' : 'APP\'s'}</span>
					</div>
					{localAvailableProviderTypes.size > 1 && (
						<div className="text-xs text-gray-400 mt-1">
							{Array.from(localAvailableProviderTypes).map(type => 
								type === 'PHYSICIAN' ? 'Physicians' : 
								type === 'APP' ? 'APP\'s' : type
							).join(', ')} data loaded
						</div>
					)}
				</div>
			)}

		</div>
	);
};

export default Sidebar; 