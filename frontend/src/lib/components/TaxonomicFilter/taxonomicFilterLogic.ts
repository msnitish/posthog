import { kea } from 'kea'
import { taxonomicFilterLogicType } from './taxonomicFilterLogicType'
import {
    TaxonomicFilterGroupType,
    TaxonomicFilterLogicProps,
    TaxonomicFilterValue,
} from 'lib/components/TaxonomicFilter/types'
import { infiniteListLogic } from 'lib/components/TaxonomicFilter/infiniteListLogic'
import { teamLogic } from '../../../scenes/teamLogic'
import { ActionType, CohortType, EventDefinition, PersonProperty, PropertyDefinition } from '../../../types'
import { actionsModel } from '../../../models/actionsModel'
import { personPropertiesModel } from '../../../models/personPropertiesModel'
import { cohortsModel } from '../../../models/cohortsModel'
import { eventDefinitionsModel } from '../../../models/eventDefinitionsModel'
import { Logic } from 'kea'

interface SimpleOption {
    name: string
}

interface Group<T> {
    name: string
    type: TaxonomicFilterGroupType
    logic?: Logic
    value?: string
    options?: SimpleOption[]
    getName: (instance: T) => string
    getValue: (instance: T) => TaxonomicFilterValue
}

export const taxonomicFilterLogic = kea<taxonomicFilterLogicType<Group>>({
    props: {} as TaxonomicFilterLogicProps,
    key: (props) => `${props.taxonomicFilterLogicKey}`,

    actions: () => ({
        moveUp: true,
        moveDown: true,
        selectSelected: (onComplete?: () => void) => ({ onComplete }),
        enableMouseInteractions: true,
        tabLeft: true,
        tabRight: true,
        setSearchQuery: (searchQuery: string) => ({ searchQuery }),
        setActiveTab: (activeTab: TaxonomicFilterGroupType) => ({ activeTab }),
        selectItem: (groupType: TaxonomicFilterGroupType, value: TaxonomicFilterValue | null, item: any) => ({
            groupType,
            value,
            item,
        }),
    }),

    reducers: ({ selectors }) => ({
        searchQuery: [
            '',
            {
                setSearchQuery: (_, { searchQuery }) => searchQuery,
                selectItem: () => '',
            },
        ],
        activeTab: [
            (state: any): TaxonomicFilterGroupType => {
                return selectors.groupType(state) || selectors.groupTypes(state)[0]
            },
            {
                setActiveTab: (_, { activeTab }) => activeTab,
            },
        ],
        mouseInteractionsEnabled: [
            // This fixes a bug with keyboard up/down scrolling when the mouse is over the list.
            // Otherwise shifting list elements cause the "hover" action to be triggered randomly.
            true,
            {
                moveUp: () => false,
                moveDown: () => false,
                setActiveTab: () => true,
                enableMouseInteractions: () => true,
            },
        ],
    }),

    selectors: {
        taxonomicFilterLogicKey: [
            () => [(_, props) => props.taxonomicFilterLogicKey],
            (taxonomicFilterLogicKey) => taxonomicFilterLogicKey,
        ],
        groups: [
            () => [teamLogic.selectors.currentTeam],
            (currentTeam) =>
                [
                    {
                        name: 'Events',
                        type: TaxonomicFilterGroupType.Events,
                        endpoint: `api/projects/${currentTeam?.id}/event_definitions`,
                        getName: (eventDefinition): string => eventDefinition.name,
                        getValue: (eventDefinition): TaxonomicFilterValue => eventDefinition.name,
                    } as Group<EventDefinition>,
                    {
                        name: 'Actions',
                        type: TaxonomicFilterGroupType.Actions,
                        logic: actionsModel,
                        value: 'actions',
                        getName: (action): string => action.name,
                        getValue: (action): TaxonomicFilterValue => action.id,
                    } as Group<ActionType>,
                    {
                        name: 'Elements',
                        type: TaxonomicFilterGroupType.Elements,
                        options: ['tag_name', 'text', 'href', 'selector'].map((option) => ({
                            name: option,
                        })),
                        getName: (option): string => option.name,
                        getValue: (option): TaxonomicFilterValue => option.name,
                    } as Group<SimpleOption>,
                    {
                        name: 'Event properties',
                        type: TaxonomicFilterGroupType.EventProperties,
                        endpoint: `api/projects/${currentTeam?.id}/property_definitions`,
                        getName: (propertyDefinition: PropertyDefinition): string => propertyDefinition.name,
                        getValue: (propertyDefinition: PropertyDefinition): TaxonomicFilterValue =>
                            propertyDefinition.name,
                    } as Group<PropertyDefinition>,
                    {
                        name: 'Person properties',
                        type: TaxonomicFilterGroupType.PersonProperties,
                        logic: personPropertiesModel,
                        value: 'personProperties',
                        getName: (personProperty): string => personProperty.name,
                        getValue: (personProperty): TaxonomicFilterValue => personProperty.name,
                    } as Group<PersonProperty>,
                    {
                        name: 'Cohorts',
                        type: TaxonomicFilterGroupType.Cohorts,
                        logic: cohortsModel,
                        value: 'cohorts',
                        getName: (cohort): string => cohort.name || `Cohort ${cohort.id}`,
                        getValue: (cohort): TaxonomicFilterValue => cohort.id,
                    } as Group<CohortType>,
                    {
                        name: 'Cohorts',
                        type: TaxonomicFilterGroupType.CohortsWithAllUsers,
                        logic: cohortsModel,
                        value: 'cohortsWithAllUsers',
                        getName: (cohort): string => cohort.name || `Cohort ${cohort.id}`,
                        getValue: (cohort): TaxonomicFilterValue => cohort.id,
                    } as Group<CohortType>,
                    {
                        name: 'Pageview Urls',
                        type: TaxonomicFilterGroupType.PageviewUrls,
                        endpoint: 'api/event/values/?key=$current_url',
                        searchAlias: 'value',
                        getName: ({ name }): string => name,
                        getValue: ({ name }): TaxonomicFilterValue => name,
                    } as Group<SimpleOption>,
                    {
                        name: 'Screens',
                        type: TaxonomicFilterGroupType.Screens,
                        endpoint: 'api/event/values/?key=$screen_name',
                        searchAlias: 'value',
                        getName: ({ name }): string => name,
                        getValue: ({ name }): TaxonomicFilterValue => name,
                    } as Group<SimpleOption>,
                    {
                        name: 'Custom Events',
                        type: TaxonomicFilterGroupType.CustomEvents,
                        logic: eventDefinitionsModel,
                        value: 'customEvents',
                        getName: (eventDefinition): string => eventDefinition.name,
                        getValue: (eventDefinition): TaxonomicFilterValue => eventDefinition.name,
                    } as Group<EventDefinition>,
                ] as (
                    | Group<SimpleOption>
                    | Group<EventDefinition>
                    | Group<PropertyDefinition>
                    | Group<CohortType>
                    | Group<PersonProperty>
                    | Group<ActionType>
                )[],
        ],
        groupTypes: [
            (s) => [(_, props) => props.groupTypes, s.groups],
            (groupTypes, groups): TaxonomicFilterGroupType[] => groupTypes || groups.map((g) => g.type),
        ],
        value: [() => [(_, props) => props.value], (value) => value],
        groupType: [() => [(_, props) => props.groupType], (groupType) => groupType],
        currentTabIndex: [
            (s) => [s.groupTypes, s.activeTab],
            (groupTypes, activeTab) => Math.max(groupTypes.indexOf(activeTab || ''), 0),
        ],
    },

    listeners: ({ actions, values, props }) => ({
        selectItem: ({ groupType, value, item }) => {
            if (item && value) {
                props.onChange?.(groupType, value, item)
            }
        },

        moveUp: async (_, breakpoint) => {
            if (values.activeTab) {
                infiniteListLogic({
                    ...props,
                    listGroupType: values.activeTab,
                }).actions.moveUp()
            }
            await breakpoint(100)
            actions.enableMouseInteractions()
        },

        moveDown: async (_, breakpoint) => {
            if (values.activeTab) {
                infiniteListLogic({
                    ...props,
                    listGroupType: values.activeTab,
                }).actions.moveDown()
            }
            await breakpoint(100)
            actions.enableMouseInteractions()
        },

        selectSelected: async (_, breakpoint) => {
            if (values.activeTab) {
                infiniteListLogic({
                    ...props,
                    listGroupType: values.activeTab,
                }).actions.selectSelected()
            }
            await breakpoint(100)
            actions.enableMouseInteractions()
        },

        tabLeft: () => {
            const { currentTabIndex, groupTypes } = values
            const newIndex = (currentTabIndex - 1 + groupTypes.length) % groupTypes.length
            actions.setActiveTab(groupTypes[newIndex])
        },

        tabRight: () => {
            const { currentTabIndex, groupTypes } = values
            const newIndex = (currentTabIndex + 1) % groupTypes.length
            actions.setActiveTab(groupTypes[newIndex])
        },
    }),
})
