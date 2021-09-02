import React, { useMemo, useState } from 'react'
import { useActions, useValues } from 'kea'
import { parsePeopleParams } from 'scenes/trends/trendsLogic'
import { DownloadOutlined, UsergroupAddOutlined } from '@ant-design/icons'
import { Modal, Button, Spin, Input, Skeleton } from 'antd'
import { FilterType, Group, GroupType, PersonType, ViewType } from '~/types'
import { personsModalLogic } from './personsModalLogic'
import { CopyToClipboardInline } from 'lib/components/CopyToClipboard'
import { midEllipsis } from 'lib/utils'
import { Link } from 'lib/components/Link'
import './PersonModal.scss'
import { PropertiesTable } from 'lib/components/PropertiesTable'
import { ExpandIcon, ExpandIconProps } from 'lib/components/ExpandIcon'
import { PropertyKeyInfo } from 'lib/components/PropertyKeyInfo'
import { DateDisplay } from 'lib/components/DateDisplay'
import { preflightLogic } from 'scenes/PreflightCheck/logic'
import { urls } from '../sceneLogic'

export interface PersonModalProps {
    visible: boolean
    view: ViewType
    filters: Partial<FilterType>
    onSaveCohort: () => void
}

export function PersonModal({ visible, view, filters, onSaveCohort }: PersonModalProps): JSX.Element {
    const {
        people,
        loadingMorePeople,
        firstLoadedPeople,
        searchTerm,
        isInitialLoad,
        clickhouseFeaturesEnabled,
    } = useValues(personsModalLogic)
    const { hidePeople, loadMorePeople, setFirstLoadedPeople, setPersonsModalFilters, setSearchTerm } = useActions(
        personsModalLogic
    )
    const { preflight } = useValues(preflightLogic)
    const title = useMemo(
        () =>
            isInitialLoad ? (
                'Loading persons…'
            ) : filters.shown_as === 'Stickiness' ? (
                <>
                    <PropertyKeyInfo value={people?.label || ''} disablePopover /> stickiness on day {people?.day}
                </>
            ) : filters.display === 'ActionsBarValue' || filters.display === 'ActionsPie' ? (
                <PropertyKeyInfo value={people?.label || ''} disablePopover />
            ) : filters.insight === ViewType.FUNNELS ? (
                <>
                    {filters.unique_group_type_id === undefined ? 'Persons' : 'Groups'} who{' '}
                    {(people?.funnelStep ?? 0) >= 0 ? 'completed' : 'dropped off at'} step #
                    {Math.abs(people?.funnelStep ?? 0)} - <PropertyKeyInfo value={people?.label || ''} disablePopover />{' '}
                    {people?.breakdown_value !== undefined &&
                        `- ${people.breakdown_value ? people.breakdown_value : 'None'}`}
                </>
            ) : (
                <>
                    <PropertyKeyInfo value={people?.label || ''} disablePopover /> on{' '}
                    <DateDisplay interval={filters.interval || 'day'} date={people?.day.toString() || ''} />
                </>
            ),
        [filters, people, isInitialLoad]
    )

    const isDownloadCsvAvailable = view === ViewType.TRENDS
    const isSaveAsCohortAvailable = clickhouseFeaturesEnabled && filters.unique_group_type_id === undefined

    return (
        <Modal
            title={title}
            visible={visible}
            onOk={hidePeople}
            onCancel={hidePeople}
            footer={
                people &&
                people.count > 0 &&
                (isDownloadCsvAvailable || isSaveAsCohortAvailable) && (
                    <>
                        {isDownloadCsvAvailable && (
                            <Button
                                icon={<DownloadOutlined />}
                                href={`/api/action/people.csv?${parsePeopleParams(
                                    {
                                        label: people.label,
                                        action: people.action,
                                        date_from: people.day,
                                        date_to: people.day,
                                        breakdown_value: people.breakdown_value,
                                    },
                                    filters
                                )}`}
                                style={{ marginRight: 8 }}
                                data-attr="person-modal-download-csv"
                            >
                                Download CSV
                            </Button>
                        )}
                        {isSaveAsCohortAvailable && (
                            <Button
                                onClick={onSaveCohort}
                                icon={<UsergroupAddOutlined />}
                                data-attr="person-modal-save-as-cohort"
                            >
                                Save as cohort
                            </Button>
                        )}
                    </>
                )
            }
            width={600}
            className="person-modal"
        >
            {isInitialLoad ? (
                <div style={{ padding: 16 }}>
                    <Skeleton active />
                </div>
            ) : (
                people && (
                    <>
                        {!preflight?.is_clickhouse_enabled && (
                            <Input.Search
                                allowClear
                                enterButton
                                placeholder="Search person by email, name, or ID"
                                onChange={(e) => {
                                    setSearchTerm(e.target.value)
                                    if (!e.target.value) {
                                        setFirstLoadedPeople(firstLoadedPeople)
                                    }
                                }}
                                value={searchTerm}
                                onSearch={(term) =>
                                    term
                                        ? setPersonsModalFilters(term, people, filters)
                                        : setFirstLoadedPeople(firstLoadedPeople)
                                }
                            />
                        )}
                        <div style={{ background: '#FAFAFA' }}>
                            {people.count > 0 ? (
                                filters.unique_group_type_id === undefined ? (
                                    people?.people.map((person) => (
                                        <div key={person.id}>
                                            <PersonRow person={person} />
                                        </div>
                                    ))
                                ) : (
                                    people?.people.map((group) => (
                                        <div key={group.id}>
                                            <GroupRow group={(group as unknown) as GroupType} />
                                        </div>
                                    ))
                                )
                            ) : (
                                <div className="person-row-container person-row">
                                    We couldn't find any matching persons for this data point.
                                </div>
                            )}
                        </div>
                        {people?.next && (
                            <div
                                style={{
                                    margin: '1rem',
                                    textAlign: 'center',
                                }}
                            >
                                <Button type="primary" style={{ color: 'white' }} onClick={loadMorePeople}>
                                    {loadingMorePeople ? <Spin /> : 'Load more people'}
                                </Button>
                            </div>
                        )}
                    </>
                )
            )}
        </Modal>
    )
}

interface PersonRowProps {
    person: PersonType
}

export function PersonRow({ person }: PersonRowProps): JSX.Element {
    const [showProperties, setShowProperties] = useState(false)
    const expandProps = {
        record: '',
        onExpand: () => setShowProperties(!showProperties),
        expanded: showProperties,
        expandable: Object.keys(person.properties).length > 0,
        prefixCls: 'ant-table',
    } as ExpandIconProps

    return (
        <div key={person.id} className="person-row-container">
            <div className="person-row">
                <ExpandIcon {...expandProps} />
                <div className="person-ids">
                    <Link to={urls.person(person.distinct_ids[0])} className="text-default">
                        <strong>{person.properties.email}</strong>
                    </Link>
                    <CopyToClipboardInline
                        explicitValue={person.distinct_ids[0]}
                        iconStyle={{ color: 'var(--primary)' }}
                        iconPosition="end"
                        className="text-small text-muted-alt"
                    >
                        {midEllipsis(person.distinct_ids[0], 32)}
                    </CopyToClipboardInline>
                </div>
            </div>
            {showProperties && <PropertiesTable properties={person.properties} className="person-modal-properties" />}
        </div>
    )
}

interface GroupRowProps {
    group: Group
}

export function GroupRow({ group }: GroupRowProps): JSX.Element {
    const [showProperties, setShowProperties] = useState(false)
    const expandProps = {
        record: '',
        onExpand: () => setShowProperties(!showProperties),
        expanded: showProperties,
        expandable: Object.keys(group.properties).length > 0,
        prefixCls: 'ant-table',
    } as ExpandIconProps

    return (
        <div key={group.id} className="person-row-container">
            <div className="person-row">
                <ExpandIcon {...expandProps} />
                <div className="person-ids">
                    <Link to={urls.group(group.type_key, group.id)} className="text-default">
                        <strong>{group.id}</strong>
                    </Link>
                </div>
            </div>
            {showProperties && <PropertiesTable properties={group.properties} className="person-modal-properties" />}
        </div>
    )
}
