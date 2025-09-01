import React, { useRef } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
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
	const navigate = useNavigate();
	const location = useLocation();
	const currentPath = location.pathname;
	const listRef = useRef<HTMLDivElement>(null);
	
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
				{ name: 'Survey Analytics', icon: PresentationChartLineIcon, path: '/analytics' },
				{ name: 'Regional Analytics', icon: ChartBarIcon, path: '/regional-analytics' },
				{ name: 'Custom Reports', icon: DocumentChartBarIcon, path: '/custom-reports' },
				{ name: 'Fair Market Value', icon: CalculatorIcon, path: '/fair-market-value' },
			]
		},
		{
			name: 'Support',
			items: [
				{ name: 'Instructions', icon: InformationCircleIcon, path: '/instructions' },
				{ name: 'Download Test', icon: ClipboardDocumentListIcon, path: '/download-test' },
			]
		}
	];

	const handleNavigation = (path: string) => navigate(path);

	// Keyboard navigation: Arrow/Home/End over visible items
	const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
		const items = Array.from((listRef.current?.querySelectorAll('[role="menuitem"]') || []) as NodeListOf<HTMLElement>);
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
				role="menuitem"
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
			<div className="flex items-center h-16 px-4">
				<div className="flex items-center">
					<div className="w-12 h-12 flex items-center justify-center">
								 <img 
										   src={process.env.PUBLIC_URL + '/favicon-32x32.svg?v=6'} 
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
							<span className="text-gray-900">Bench</span>
							<span className="text-indigo-600">Point</span>
						</span>
					)}
				</div>
			</div>

			{/* Main Menu */}
			<nav aria-label="Primary" className="flex-1 px-3 py-6 overflow-y-auto">
				<div role="menu" ref={listRef} onKeyDown={handleKeyDown}>
					{menuGroups.map((group, index) => renderMenuGroup(group, index))}
				</div>
			</nav>

			{/* Bottom Section */}
			<div className="absolute left-4 bottom-4">
				<div className="group relative">
					<button
						onClick={() => setIsOpen(!isOpen)}
						className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 bg-white shadow-md hover:bg-gray-100 transition-all duration-200 focus:outline-none"
						aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
					>
						{isOpen ? (
							<ChevronLeftIcon className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
						) : (
							<ChevronRightIcon className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
						)}
					</button>
					<span className="absolute left-14 top-1/2 -translate-y-1/2 px-3 py-1 rounded bg-gray-900 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
						{isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
					</span>
				</div>
			</div>
		</div>
	);
};

export default Sidebar; 