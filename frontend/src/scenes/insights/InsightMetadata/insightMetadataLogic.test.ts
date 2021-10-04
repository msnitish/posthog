import { BuiltLogic } from 'kea'
import { insightMetadataLogicType } from 'scenes/insights/InsightMetadata/insightMetadataLogicType'
import { insightMetadataLogic, InsightMetadataLogicProps } from 'scenes/insights/InsightMetadata/insightMetadataLogic'
import { expectLogic, initKeaTestLogic } from '~/test/kea-test-utils'
import { insightLogic } from 'scenes/insights/insightLogic'
import { truth } from '~/test/kea-test-utils/jest'

describe('insightMetadataLogic', () => {
    let logic: BuiltLogic<insightMetadataLogicType<InsightMetadataLogicProps>>

    const insight = {
        name: 'Creative Insight Name',
        description: 'More Creative Description',
        tags: ['Most Creative Tag'],
    }

    initKeaTestLogic({
        logic: insightMetadataLogic,
        props: { insight },
        onLogic: (l) => (logic = l),
    })

    describe('core assumptions', () => {
        it('mounts other logics', async () => {
            await expectLogic(logic).toMount([insightLogic])
        })

        // Below is more fully tested by testing of cleanMetadataValues() in utils.test
        describe('props with happy case metadata', () => {
            it('props persist as insightMetadataValues', async () => {
                await expectLogic(logic).toMatchValues({
                    insightMetadata: insight,
                })
            })
        })

        describe('props with malformed metadata', () => {
            initKeaTestLogic({
                logic: insightMetadataLogic,
                props: {
                    insight: {
                        name: undefined,
                        description: '         ',
                    },
                },
                onLogic: (l) => (logic = l),
            })

            it('insightMetadata values are cleaned', async () => {
                await expectLogic(logic).toMatchValues({
                    insightMetadata: {
                        name: null,
                        description: null,
                    },
                })
            })
        })
    })

    describe('input interactions', () => {
        initKeaTestLogic({
            logic: insightMetadataLogic,
            props: {
                insight: {},
            },
            onLogic: (l) => (logic = l),
        })

        describe('setInsightMetadata', () => {
            it('sets well formed properties', async () => {
                await expectLogic(logic, () => {
                    logic.actions.setInsightMetadata(insight)
                })
                    .toDispatchActions(['setInsightMetadata'])
                    .toMatchValues({
                        insightMetadata: insight,
                    })
            })

            it('sets null for malformed properties', async () => {
                expectLogic(logic, () => {
                    logic.actions.setInsightMetadata({
                        name: '     ',
                        description: undefined,
                    })
                })
                    .toDispatchActions(['setInsightMetadata'])
                    .toMatchValues({
                        insightMetadata: {
                            name: null,
                            description: null,
                        },
                    })
            })
        })

        describe('saveInsightMetadata', () => {
            it('set metadata property in insightLogic', async () => {
                logic.actions.setInsightMetadata(insight)

                await expectLogic(() => {
                    logic.actions.saveInsightMetadata('name')
                })
                    .toDispatchActions(logic, ['saveInsightMetadata'])
                    .toDispatchActions(insightLogic, [
                        insightLogic.actionCreators.setInsight({ name: insight.name }, true),
                    ])
                    .toDispatchActions(logic, [
                        logic.actionCreators.setInsightMetadata({ name: insight.name }),
                        'showViewMode',
                    ])
                    .toMatchValues(logic, {
                        editableProps: truth((set) => !set.has('name')),
                    })
            })
        })

        describe('cancelInsightMetadata', () => {
            it('nullifies metadata and shows view mode', async () => {
                logic.actions.setInsightMetadata(insight)

                await expectLogic(logic, () => {
                    logic.actions.cancelInsightMetadata('name')
                })
                    .toDispatchActions(['cancelInsightMetadata', 'showViewMode'])
                    .toMatchValues({
                        insightMetadata: {
                            ...insight,
                            name: null,
                        },
                    })
            })
        })

        describe('show{Edit/View}Mode', () => {
            it('make `name` property editable', async () => {
                await expectLogic(logic, () => {
                    logic.actions.showEditMode('name')
                })
                    .toDispatchActions(['showEditMode'])
                    .toMatchValues({
                        editableProps: truth((set) => set.has('name')),
                    })
            })

            it('make `name` property non-editable', async () => {
                logic.actions.showEditMode('name')

                await expectLogic(logic, () => {
                    logic.actions.showViewMode('name')
                })
                    .toDispatchActions(['showViewMode'])
                    .toMatchValues({
                        editableProps: truth((set) => !set.has('name')),
                    })
            })
        })
    })
})
