import { Skeleton, Card, Layout } from "antd";

const { Content } = Layout;

/**
 * Route-level loading skeleton for signals page.
 * Shown automatically by Next.js during route transitions.
 */
export default function SignalsLoading() {
    return (
        <Layout className="min-h-screen" style={{ background: "var(--background)" }}>
            <Content className="p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header skeleton */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <Skeleton.Input active style={{ width: 220, height: 28 }} />
                            <Skeleton.Input active size="small" style={{ width: 300, marginTop: 4 }} />
                        </div>
                        <Skeleton.Button active />
                    </div>

                    {/* Tabs skeleton */}
                    <div className="flex gap-4 mb-4">
                        {[1, 2, 3].map(i => (
                            <Skeleton.Button key={i} active style={{ width: 80 }} />
                        ))}
                    </div>

                    {/* Stats cards skeleton */}
                    <div className="grid grid-cols-6 gap-3 mb-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Card key={i} size="small" className="text-center">
                                <Skeleton.Input active style={{ width: 40, height: 32 }} />
                                <br />
                                <Skeleton.Input active size="small" style={{ width: 60, marginTop: 4 }} />
                            </Card>
                        ))}
                    </div>

                    {/* Table skeleton */}
                    <Card styles={{ body: { padding: 16 } }}>
                        <Skeleton active paragraph={{ rows: 15 }} />
                    </Card>
                </div>
            </Content>
        </Layout>
    );
}
