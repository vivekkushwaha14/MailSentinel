import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Background, Controls, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../services/api';

const nodeColors = {
  campaign: '#111827',
  email: '#2563eb',
  domain: '#d97706',
  sender: '#059669',
  ip: '#7c3aed',
  url: '#dc2626',
  attachment_hash: '#4b5563'
};

const CampaignDetail = () => {
  const { id } = useParams();
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get(`/campaigns/${id}/graph`)
      .then((res) => {
        if (active) setGraph(res.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load campaign graph');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const { nodes, edges } = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };
    const radius = 260;
    const center = { x: 360, y: 220 };

    return {
      nodes: graph.nodes.map((node, index) => {
        const angle = ((index - 1) / Math.max(graph.nodes.length - 1, 1)) * Math.PI * 2;
        const isCampaign = node.type === 'campaign';
        return {
          id: node.id,
          data: { label: `${node.type}: ${node.label}` },
          position: isCampaign ? center : {
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius
          },
          style: {
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: nodeColors[node.type] || '#f9fafb',
            color: ['campaign', 'email', 'url', 'ip'].includes(node.type) ? '#fff' : '#111827',
            width: 190,
            fontSize: 12
          }
        };
      }),
      edges: graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        animated: edge.label !== 'contains'
      }))
    };
  }, [graph]);

  if (loading) {
    return <div className="rounded border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading campaign graph...</div>;
  }

  if (error) {
    return <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase text-gray-500">{graph.campaign.campaignId}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-normal">{graph.campaign.name}</h2>
        <p className="mt-1 text-sm text-gray-500">Shared indicators and email relationships in this campaign.</p>
      </div>

      <section className="h-[560px] overflow-hidden rounded border border-gray-200 bg-white">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </section>

      <section className="rounded border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="font-semibold">Emails</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {graph.campaign.emails?.map((email) => (
            <Link key={email._id} to={`/investigation/${email._id}`} className="block px-5 py-4 hover:bg-gray-50">
              <p className="font-medium">{email.subject}</p>
              <p className="mt-1 text-sm text-gray-500">{email.from?.address || 'Unknown sender'}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CampaignDetail;
