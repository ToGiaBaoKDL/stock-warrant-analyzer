"use client";

import React, { useState, useEffect } from "react";
import { Modal, Form, InputNumber, Button, Typography, Space, Tooltip } from "antd";
import { SettingOutlined, SaveOutlined, InfoCircleOutlined, DollarOutlined } from "@ant-design/icons";
import { useWarrantStore } from "@/stores/useWarrantStore";

const { Text } = Typography;

interface FeeSettingsModalProps {
    open: boolean;
    onClose: () => void;
}

/**
 * Modal component for customizing trading fee settings.
 * 
 * Allows users to configure:
 * - Buy fee percent (broker fee for buying)
 * - Sell fee percent (broker fee for selling)
 * - Sell tax percent (personal income tax on securities)
 * 
 * Settings are persisted via Zustand to localStorage.
 */
export function FeeSettingsModal({ open, onClose }: FeeSettingsModalProps) {
    const { feeSettings, setFeeSettings } = useWarrantStore();
    const [form] = Form.useForm();
    const [hasChanges, setHasChanges] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (open && feeSettings) {
            form.setFieldsValue({
                buyFeePercent: feeSettings.buyFeePercent,
                sellFeePercent: feeSettings.sellFeePercent,
                sellTaxPercent: feeSettings.sellTaxPercent,
            });
            setHasChanges(false);
        }
    }, [open, feeSettings, form]);

    const handleValuesChange = () => {
        setHasChanges(true);
    };

    const handleSave = () => {
        const values = form.getFieldsValue();
        setFeeSettings({
            buyFeePercent: values.buyFeePercent ?? 0.15,
            sellFeePercent: values.sellFeePercent ?? 0.15,
            sellTaxPercent: values.sellTaxPercent ?? 0.1,
        });
        setHasChanges(false);
        onClose();
    };

    const handleReset = () => {
        form.setFieldsValue({
            buyFeePercent: 0.15,
            sellFeePercent: 0.15,
            sellTaxPercent: 0.1,
        });
        setHasChanges(true);
    };

    return (
        <Modal
            title={null}
            open={open}
            onCancel={onClose}
            footer={null}
            width={450}
            className="fee-settings-modal"
            centered
            closeIcon={null}
            styles={{
                body: { padding: 0 }
            }}
        >
            {/* Header with Brand Color - Fixed overlap with close button */}
            <div className="bg-gradient-to-r from-[#CC785C] to-[#a85d45] px-5 py-4 relative">
                <div className="flex items-center gap-3 pr-8">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <DollarOutlined className="text-[#CC785C] text-xl" />
                    </div>
                    <div>
                        <Text className="!text-white font-bold text-base block">Phí giao dịch</Text>
                        <Text className="!text-white text-xs">Tùy chỉnh theo CTCK của bạn</Text>
                    </div>
                </div>
                {/* Custom Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                    aria-label="Close"
                >
                    <span className="text-lg leading-none">×</span>
                </button>
            </div>

            {/* Form Content */}
            <div className="p-5">
                <Form
                    form={form}
                    layout="vertical"
                    onValuesChange={handleValuesChange}
                    initialValues={{
                        buyFeePercent: feeSettings?.buyFeePercent ?? 0.15,
                        sellFeePercent: feeSettings?.sellFeePercent ?? 0.15,
                        sellTaxPercent: feeSettings?.sellTaxPercent ?? 0.1,
                    }}
                >
                    {/* 3 Fee Inputs in same row */}
                    <div className="grid grid-cols-3 gap-3">
                        <Form.Item
                            name="buyFeePercent"
                            label={<Text className="text-gray-600 font-medium text-xs">Phí mua</Text>}
                            className="mb-3"
                        >
                            <InputNumber
                                min={0}
                                max={1}
                                step={0.01}
                                precision={2}
                                suffix="%"
                                className="w-full"
                            />
                        </Form.Item>

                        <Form.Item
                            name="sellFeePercent"
                            label={<Text className="text-gray-600 font-medium text-xs">Phí bán</Text>}
                            className="mb-3"
                        >
                            <InputNumber
                                min={0}
                                max={1}
                                step={0.01}
                                precision={2}
                                suffix="%"
                                className="w-full"
                            />
                        </Form.Item>

                        <Form.Item
                            name="sellTaxPercent"
                            label={
                                <div className="flex items-center gap-1">
                                    <Text className="text-gray-600 font-medium text-xs">Thuế TNCN</Text>
                                    <Tooltip title="Cố định 0.1%">
                                        <InfoCircleOutlined className="text-gray-400 text-xs" />
                                    </Tooltip>
                                </div>
                            }
                            className="mb-3"
                        >
                            <InputNumber
                                min={0}
                                max={1}
                                step={0.01}
                                precision={2}
                                suffix="%"
                                className="w-full"
                                disabled
                            />
                        </Form.Item>
                    </div>

                    {/* Quick Reference - 3 brokers in same row */}
                    {/* Quick Reference - No container */}
                    <Text className="text-gray-400 text-xs block mb-2">Phí phổ biến theo CTCK</Text>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                            { name: "SSI, VND", fee: "0.15%" },
                            { name: "TCBS", fee: "0.15%" },
                            { name: "Mirae", fee: "0.10%" },
                        ].map((broker) => (
                            <div key={broker.name} className="text-xs bg-gray-50 px-2 py-2 rounded-lg text-center border border-gray-100">
                                <span className="text-gray-500">{broker.name}</span>
                                <br />
                                <span className="text-[#CC785C] font-semibold">{broker.fee}</span>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button onClick={handleReset} className="flex-1" size="large">
                            Mặc định
                        </Button>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={handleSave}
                            className="flex-[2] !bg-[#CC785C] !border-[#CC785C] hover:!bg-[#b5654a] hover:!border-[#b5654a]"
                            size="large"
                        >
                            {hasChanges ? "Lưu thay đổi" : "Đóng"}
                        </Button>
                    </div>
                </Form>
            </div>
        </Modal>
    );
}

// Button to trigger the modal
export function FeeSettingsButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button
                icon={<SettingOutlined />}
                onClick={() => setIsOpen(true)}
                size="small"
                className="!h-[32px]"
            >
                Phí GD
            </Button>
            <FeeSettingsModal open={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}

export default FeeSettingsModal;
