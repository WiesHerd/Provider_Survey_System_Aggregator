import React, { useRef, useMemo } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useProviderContext } from '../contexts/ProviderContext';
import { ProviderTypeSelector } from '../shared/components';
import {
	HomeIcon,
	ChartBarIcon,
	ArrowUpTrayIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	TableCellsIcon,
	ClipboardDocumentListIcon,
	PresentationChartLineIcon,
	MapIcon,
	CalculatorIcon,
	InformationCircleIcon,
	DocumentChartBarIcon,
	CpuChipIcon,
	UserIcon,
	CurrencyDollarIcon,
	CircleStackIcon,
	UserGroupIcon,
	BuildingOfficeIcon,
	ShieldCheckIcon,
	ChartPieIcon,
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
	providerTypes?: ('PHYSICIAN' | 'APP' | 'BOTH')[];
	children?: MenuItem[];
}

interface MenuGroup {
	name: string;
	items: MenuItem[];
	providerTypes?: ('PHYSICIAN' | 'APP' | 'BOTH')[];
}

const EnhancedSidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
	const navigate = useNavigate();
	const location = useLocation();
	const currentPath = location.pathname;
	const listRef = useRef<HTMLDivElement>(null);
	const { selectedProviderType, setProviderType } = useProviderContext();
	
	// Define all menu groups with provider type support
	const allMenuGroups: MenuGroup[] = [
		{
			name: 'Getting Started',
			items: [
				{ name: 'Home', icon: HomeIcon, path: '/dashboard', providerTypes: ['PHYSICIAN', 'APP', 'BOTH'] },
				{ name: 'Upload Data', icon: ArrowUpTrayIcon, path: '/upload', providerTypes: ['PHYSICIAN', 'APP', 'BOTH'] },
			],
			providerTypes: ['PHYSICIAN', 'APP', 'BOTH']
		},
		{
			name: 'Physician Data Mapping',
			items: [
				{ name: 'Physician Specialties', icon: MedicalCrossIcon, path: '/physician/specialty-mapping', providerTypes: ['PHYSICIAN'] },
				{ name: 'Physician Provider Types', icon: UserIcon, path: '/physician/provider-type-mapping', providerTypes: ['PHYSICIAN'] },
				{ name: 'Physician Regions', icon: MapIcon, path: '/physician/region-mapping', providerTypes: ['PHYSICIAN'] },
				{ name: 'Physician Comp Metrics', icon: CurrencyDollarIcon, path: '/physician/variable-mapping', providerTypes: ['PHYSICIAN'] },
				{ name: 'Physician Other Mappings', icon: TableCellsIcon, path: '/physician/column-mapping', providerTypes: ['PHYSICIAN'] },
			],
			providerTypes: ['PHYSICIAN']
		},
		{
			name: 'APP Data Mapping',
			items: [
				{ name: 'APP Specialties', icon: MedicalCrossIcon, path: '/app/specialty-mapping', providerTypes: ['APP'] },
				{ name: 'APP Provider Types', icon: UserGroupIcon, path: '/app/provider-type-mapping', providerTypes: ['APP'] },
				{ name: 'APP Practice Settings', icon: BuildingOfficeIcon, path: '/app/practice-setting-mapping', providerTypes: ['APP'] },
				{ name: 'APP Supervision Levels', icon: ShieldCheckIcon, path: '/app/supervision-level-mapping', providerTypes: ['APP'] },
				{ name: 'APP Comp Metrics', icon: CurrencyDollarIcon, path: '/app/variable-mapping', providerTypes: ['APP'] },
				{ name: 'APP Other Mappings', icon: TableCellsIcon, path: '/app/column-mapping', providerTypes: ['APP'] },
			],
			providerTypes: ['APP']
		},
		{
			name: 'Analytics & Reports',
			items: [
				{ name: 'Normalized Data', icon: CircleStackIcon, path: '/normalized-data', providerTypes: ['PHYSICIAN', 'APP', 'BOTH'] },
				{ name: 'Survey Analytics', icon: PresentationChartLineIcon, path: '/analytics', providerTypes: ['PHYSICIAN', 'APP', 'BOTH'] },
				{ name: 'Regional Analytics', icon: ChartBarIcon, path: '/regional-analytics', providerTypes: ['PHYSICIAN', 'APP', 'BOTH'] },
				{ name: 'Custom Reports', icon: DocumentChartBarIcon, path: '/custom-reports', providerTypes: ['PHYSICIAN', 'APP', 'BOTH'] },
				{ name: 'Fair Market Value', icon: CalculatorIcon, path: '/fair-market-value', providerTypes: ['PHYSICIAN', 'APP', 'BOTH'] },
			],
			providerTypes: ['PHYSICIAN', 'APP', 'BOTH']
		},
		{
			name: 'Cross-Provider Analytics',
			items: [
				{ name: 'Provider Comparison', icon: ChartPieIcon, path: '/cross-provider/comparison', providerTypes: ['BOTH'] },
				{ name: 'Market Analysis', icon: PresentationChartLineIcon, path: '/cross-provider/market-analysis', providerTypes: ['BOTH'] },
				{ name: 'Compensation Trends', icon: ChartBarIcon, path: '/cross-provider/trends', providerTypes: ['BOTH'] },
			],
			providerTypes: ['BOTH']
		}
	];

	// Filter menu groups based on selected provider type
	const menuGroups = useMemo(() => {
		return allMenuGroups.filter(group => {
			// Show group if it supports the current provider type
			return group.providerTypes?.includes(selectedProviderType) || 
				   group.providerTypes?.includes('BOTH') ||
				   !group.providerTypes; // Show if no provider type restriction
		}).map(group => ({
			...group,
			items: group.items.filter(item => {
				// Show item if it supports the current provider type
				return item.providerTypes?.includes(selectedProviderType) || 
					   item.providerTypes?.includes('BOTH') ||
					   !item.providerTypes; // Show if no provider type restriction
			})
		}));
	}, [selectedProviderType]);

	const handleNavigation = (path: string) => navigate(path);

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

	const renderMenuGroup = (group: MenuGroup) => {
		if (group.items.length === 0) return null;

		return (
			<div key={group.name} className="mb-6">
				{isOpen && (
					<h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
						{group.name}
					</h3>
				)}
				<div className="space-y-1">
					{group.items.map(renderMenuItem)}
				</div>
			</div>
		);
	};

	return (
		<div className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
			isOpen ? 'w-64' : 'w-16'
		}`}>
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
				{isOpen && (
					<div className="flex items-center">
						<div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-lg">
							<CpuChipIcon className="w-5 h-5 text-white" />
						</div>
						<span className="ml-3 text-lg font-semibold text-gray-900">BenchPoint</span>
					</div>
				)}
				{!isOpen && (
					<div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-lg mx-auto">
						<CpuChipIcon className="w-5 h-5 text-white" />
					</div>
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

			{/* Provider Type Selector */}
			{isOpen && (
				<div className="px-3 py-4 border-b border-gray-100">
					<div className="mb-2">
						<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
							Data View
						</h3>
					</div>
					<ProviderTypeSelector
						value={selectedProviderType}
						onChange={(providerType) => setProviderType(providerType, 'sidebar')}
						showBothOption={true}
						context="navigation"
						className="w-full"
					/>
				</div>
			)}

			{/* Main Menu */}
			<nav aria-label="Primary" className="flex-1 px-3 py-6 overflow-y-auto">
				<div ref={listRef} onKeyDown={handleKeyDown}>
					{menuGroups.map(renderMenuGroup)}
				</div>
			</nav>

			{/* Footer */}
			<div className="px-3 py-4 border-t border-gray-200">
				{isOpen ? (
					<div className="flex items-center text-sm text-gray-500">
						<InformationCircleIcon className="w-4 h-4 mr-2" />
						<span>Provider: {selectedProviderType}</span>
					</div>
				) : (
					<div className="flex justify-center">
						<InformationCircleIcon className="w-4 h-4 text-gray-400" />
					</div>
				)}
			</div>
		</div>
	);
};

export default EnhancedSidebar;
